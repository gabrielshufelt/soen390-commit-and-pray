// withFirebaseCompatibility.js
//
// This plugin patches the iOS Podfile so Firebase works with:
//   - use_frameworks! :linkage => :static (needed when using static frameworks)
//   - New Architecture enabled (required by react-native-reanimated)
//
// Problem 1 (RNFB module conflict):
//   When use_frameworks! is active, CocoaPods generates a .modulemap file for
//   every pod. This creates a Clang module boundary. RNFBApp imports a React
//   header first, so Clang ties that header to the RNFBApp module. When
//   RNFBAnalytics then tries to import the same header, Clang says it must
//   come from RNFBApp's module instead -> build error.
//   Fix: empty the .modulemap files for RNFB pods after pod install.
//
// Problem 2 (GoogleUtilities umbrella header missing NSData+zlib):
//   FirebaseCoreInternal Swift code calls gul_data(byGzippingData:) which is
//   defined in GULNSData+zlib.h (a GoogleUtilities subspec). CocoaPods does not
//   include this header in the auto-generated GoogleUtilities-umbrella.h, so
//   Swift cannot see those methods -> build error "type NSData has no member gul_data".
//   Fix: inject the missing #import into the umbrella header after pod install.

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
      //         so Clang does not treat them as separate module boundaries.
      //         Also inject the missing NSData+zlib import into the GoogleUtilities
      //         umbrella header so FirebaseCoreInternal Swift can call gul_data.
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
          `\n` +
          `    # fix: add the missing NSData+zlib header to the GoogleUtilities umbrella\n` +
          `    # so FirebaseCoreInternal can call gul_data(byGzippingData:) from Swift\n` +
          `    gu_umbrella = File.join(\n` +
          `      installer.sandbox.root,\n` +
          `      'Target Support Files', 'GoogleUtilities', 'GoogleUtilities-umbrella.h'\n` +
          `    )\n` +
          `    if File.exist?(gu_umbrella)\n` +
          `      content = File.read(gu_umbrella)\n` +
          `      zlib_import = '#import "GULNSData+zlib.h"'\n` +
          `      unless content.include?(zlib_import)\n` +
          `        File.write(gu_umbrella, content + "\\n#{zlib_import}\\n")\n` +
          `        puts "[withFirebaseCompatibility] Patched GoogleUtilities umbrella with NSData+zlib"\n` +
          `      end\n` +
          `    end\n` +
          `    `;
        podfile = podfile.replace(
          'react_native_post_install(',
          patch + 'react_native_post_install('
        );
        console.log('[withFirebaseCompatibility] Will clear RNFB modulemaps and patch GoogleUtilities umbrella');
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};

module.exports = withFirebaseCompatibility;
