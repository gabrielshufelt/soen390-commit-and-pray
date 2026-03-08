// withFirebaseCompatibility.js
//
// This plugin patches the iOS Podfile so Firebase works with:
//   - use_frameworks! :linkage => :static (needed when using static frameworks)
//   - New Architecture enabled (required by react-native-reanimated)
//
// The problem:
//   When use_frameworks! is active, CocoaPods generates a .modulemap file for
//   every pod. This creates a Clang module boundary. RNFBApp imports a React
//   header first, so Clang ties that header to the RNFBApp module. When
//   RNFBAnalytics then tries to import the same header, Clang says it must
//   come from RNFBApp's module instead -> build error.
//
// The fix:
//   After pod install, we empty the .modulemap files for RNFB pods.
//   An empty modulemap means no module boundary, so both pods share headers
//   without conflict.

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// This variable tells the Firebase SDK pods to link as static frameworks
const STATIC_FW_MARKER = '$RNFirebaseAsStaticFramework = true';

// The two RNFB pods that cause the module conflict
const RNFB_PODS = ['RNFBApp', 'RNFBAnalytics'];

const withFirebaseCompatibility = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Step 1: inject $RNFirebaseAsStaticFramework = true before the RN setup call
      if (!podfile.includes(STATIC_FW_MARKER)) {
        podfile = podfile.replace(
          'prepare_react_native_project!',
          `${STATIC_FW_MARKER}\n\nprepare_react_native_project!`
        );
        console.log('[withFirebaseCompatibility] Added $RNFirebaseAsStaticFramework = true');
      }

      // Step 2: in post_install, empty the .modulemap files for RNFB pods
      //         so Clang does not treat them as separate module boundaries
      const patchMarker = 'RNFB_modulemap_clear_patch';
      if (!podfile.includes(patchMarker)) {
        const rnfbPodList = RNFB_PODS.map((p) => `'${p}'`).join(', ');
        const patch =
          `# ${patchMarker}\n` +
          `    rnfb_pods = [${rnfbPodList}]\n` +
          `    rnfb_pods.each do |pod_name|\n` +
          `      support_dir = File.join(installer.sandbox.root, 'Target Support Files', pod_name)\n` +
          `      Dir.glob(File.join(support_dir, '*.modulemap')).each do |mm_path|\n` +
          `        File.write(mm_path, '')\n` +
          `        puts "[withFirebaseCompatibility] Cleared modulemap: #{mm_path}"\n` +
          `      end\n` +
          `    end\n` +
          `    `;
        podfile = podfile.replace(
          'react_native_post_install(',
          patch + 'react_native_post_install('
        );
        console.log('[withFirebaseCompatibility] Will clear RNFB modulemap files in post_install');
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};

module.exports = withFirebaseCompatibility;
