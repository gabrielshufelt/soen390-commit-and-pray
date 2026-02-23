/**
 * Static image registry for building images.
 * Maps building codes to their require()'d image assets.
 * React Native requires static require() calls — dynamic paths are not supported.
 */
const BUILDING_IMAGES: Record<string, any> = {
    // SGW Campus
    H: require('../assets/building-images/sgw/h-hallbuilding.jpg'),
    LB: require('../assets/building-images/sgw/lb-library.jpg'),
    MB: require('../assets/building-images/sgw/mb-molsonbuilding.jpg'),
    GM: require('../assets/building-images/sgw/gm-guydemaisonneuve.jpg'),
    TD: require('../assets/building-images/sgw/td-torontodominion.jpg'),
    FG: require('../assets/building-images/sgw/fg-faubourgstecatherine.jpg'),
    FB: require('../assets/building-images/sgw/fb-faubourgbuilding.jpg'),
    EV: require('../assets/building-images/sgw/ev-engineervisualarts.jpg'),
    VA: require('../assets/building-images/sgw/va-visualarts.jpg'),
    LS: require('../assets/building-images/sgw/ls-learningsquare.jpg'),
    GN: require('../assets/building-images/sgw/gn-greynuns.jpg'),

    // Loyola Campus
    SP: require('../assets/building-images/loyola/sp-sciencecomplex.jpg'),
    FC: require('../assets/building-images/loyola/fc-smithbuilding.jpg'),
    RA: require('../assets/building-images/loyola/ra-recreationathletics.jpg'),
    PS: require('../assets/building-images/loyola/ps-physicalservices.jpg'),
    CJ: require('../assets/building-images/loyola/cj-communicationjournalism.jpg'),
    SC: require('../assets/building-images/loyola/sc-studentcenter.jpg'),
    JR: require('../assets/building-images/loyola/jr-jesuitresidence.jpg'),
    SH: require('../assets/building-images/loyola/sh-futurebuildings.jpg'),
    TA: require('../assets/building-images/loyola/ta-terrebonne.jpg'),
    GE: require('../assets/building-images/loyola/ge-genomics.jpg'),
    PC: require('../assets/building-images/loyola/pc-performcenter.jpg'),
    HC: require('../assets/building-images/loyola/hc-hingstonhall.jpg'),
    BB: require('../assets/building-images/loyola/bb-bbannex.jpg'),
    BH: require('../assets/building-images/loyola/bh-bhannex.jpg'),
    PT: require('../assets/building-images/loyola/pt-oscarpetersonconcerthall.jpg'),
    RF: require('../assets/building-images/loyola/rf-loyolajesuithallandconference.jpg'),
    CC: require('../assets/building-images/loyola/cc-centralbuilding.jpg'),
    AD: require('../assets/building-images/loyola/ad-adminstration.jpg'),
    HU: require('../assets/building-images/loyola/hu-appliedsciencehub.jpg'),
    VL: require('../assets/building-images/loyola/vl-vanierlibrary.jpg'),
};

export default BUILDING_IMAGES;
