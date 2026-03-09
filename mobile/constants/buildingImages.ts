/**
 * Static image registry for building images.
 * Maps building codes to their require()'d image assets.
 * React Native requires static require() calls — dynamic paths are not supported.
 */
const BUILDING_IMAGES: Record<string, any> = {
    // SGW Campus
    H: require('../assets/building-images/sgw/h-hallbuilding.webp'),
    LB: require('../assets/building-images/sgw/lb-library.webp'),
    MB: require('../assets/building-images/sgw/mb-molsonbuilding.webp'),
    GM: require('../assets/building-images/sgw/gm-guydemaisonneuve.webp'),
    TD: require('../assets/building-images/sgw/td-torontodominion.webp'),
    FG: require('../assets/building-images/sgw/fg-faubourgstecatherine.webp'),
    FB: require('../assets/building-images/sgw/fb-faubourgbuilding.webp'),
    EV: require('../assets/building-images/sgw/ev-engineervisualarts.webp'),
    VA: require('../assets/building-images/sgw/va-visualarts.webp'),
    LS: require('../assets/building-images/sgw/ls-learningsquare.webp'),
    GN: require('../assets/building-images/sgw/gn-greynuns.webp'),

    // Loyola Campus
    SP: require('../assets/building-images/loyola/sp-sciencecomplex.webp'),
    FC: require('../assets/building-images/loyola/fc-smithbuilding.webp'),
    RA: require('../assets/building-images/loyola/ra-recreationathletics.webp'),
    PS: require('../assets/building-images/loyola/ps-physicalservices.webp'),
    CJ: require('../assets/building-images/loyola/cj-communicationjournalism.webp'),
    SC: require('../assets/building-images/loyola/sc-studentcenter.webp'),
    JR: require('../assets/building-images/loyola/jr-jesuitresidence.webp'),
    SH: require('../assets/building-images/loyola/sh-futurebuildings.webp'),
    TA: require('../assets/building-images/loyola/ta-terrebonne.webp'),
    GE: require('../assets/building-images/loyola/ge-genomics.webp'),
    PC: require('../assets/building-images/loyola/pc-performcenter.webp'),
    HC: require('../assets/building-images/loyola/hc-hingstonhall.webp'),
    BB: require('../assets/building-images/loyola/bb-bbannex.webp'),
    BH: require('../assets/building-images/loyola/bh-bhannex.webp'),
    PT: require('../assets/building-images/loyola/pt-oscarpetersonconcerthall.webp'),
    RF: require('../assets/building-images/loyola/rf-loyolajesuithallandconference.webp'),
    CC: require('../assets/building-images/loyola/cc-centralbuilding.webp'),
    AD: require('../assets/building-images/loyola/ad-adminstration.webp'),
    HU: require('../assets/building-images/loyola/hu-appliedsciencehub.webp'),
    VL: require('../assets/building-images/loyola/vl-vanierlibrary.webp'),
};

export default BUILDING_IMAGES;
