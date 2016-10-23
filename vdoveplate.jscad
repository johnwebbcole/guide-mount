// title      : vdoveplate
// author     : John Cole
// license    : ISC License
// file       : vdoveplate.jscad

/* exported main, getParameterDefinitions */

function getParameterDefinitions() {

    return [{
        name: 'resolution',
        type: 'choice',
        values: [0, 1, 2, 3, 4],
        captions: ['very low (6,16)', 'low (8,24)', 'normal (12,32)', 'high (24,64)', 'very high (48,128)'],
        initial: 2,
        caption: 'Resolution:'
    }];
}

function inch(x) {
    return x * 25.4;
}

/**
 * Create a Losmondy style plate.
 * Losmondy plate dimensions from https://stargazerslounge.com/topic/181088-losmandy-dovetail-dimensions/
 * @param {number} length length of the plate
 */
function LPlate(length) {
    var base = Parts.Cube([length, inch(2.95), inch(0.235)])
        .bisect('y', 0, -30, 'x', 0)
        .parts.negative
        .bisect('y', -0, 30, 'x', 0)
        .parts.positive
        .Center();

    var plate = Parts.Cube([length, inch(4), inch(0.265)])
        .align(base, 'xy')
        .snap(base, 'z', 'outside-');

    return union([
        base,
        plate
    ]).color('gray');
}

function VPlate(length) {
    // vixen dimensions from http://www.ioptron.com/v/Manuals/8422-115_CAD.jpg

    var base = Parts.Cube([length, 44.5, 15])
        .bisect('y', 0, -15, 'x', 0)
        .parts.negative
        .bisect('y', -0, 15, 'x', 0)
        .parts.positive
        .Center()
        .color('gray');

    return base;
}

function main(params) {

    var resolutions = [
        [6, 16],
        [8, 24],
        [12, 32],
        [24, 64],
        [48, 128]
    ];
    CSG.defaultResolution3D = resolutions[params.resolution][0];
    CSG.defaultResolution2D = resolutions[params.resolution][1];
    util.init(CSG);

    var length = 120;

    var hole = Parts.Cylinder(inch(0.2660), inch(1));
    var hole2 = Parts.Cylinder(inch(1 / 2), inch(7 / 32));
    var base, halfdove, notch;

    // if (true) {
    //     return LPlate(length)
    //         .subtract(union([
    //             hole,
    //             hole2
    //         ]));
    // } else {
    //     return VPlate(length).subtract(union([
    //         hole,
    //         hole2
    //     ]));
    //
    // }
    //

    // var lplate = LPlate(length);

    function bolt(length) {
        var b = Parts.Hardware.PanHeadScrew(inch(0.375), inch(0.25), inch(0.25), length);
        // b.add(Parts.Hardware.PanHeadScrew(inch(0.375), inch(0.25), inch(0.25), length), 'clearance');
        //
        b.add(Parts.Hardware.PanHeadScrew(inch(0.48), inch(0.25) + inch(0.0625), inch(0.28125), length), 'clearance'); // washer size
        return b;
    }

    var boltM6 = Parts.Hardware.PanHeadScrew(8.5, 5, 5, 65);
    var bolt14x1 = bolt(inch(1));

    var vplate = VPlate(length).rotateY(180).Zero();

    var clamp = Parts.BBox(vplate.enlarge(0, 20, 10)).Zero();

    var p1 = clamp.subtract(vplate).bisect('y', 20);
    var p2 = p1.parts.negative.bisect('y', -20);

    var c1 = p2.parts.positive.bisect('x', length / 3, 15);
    var c2 = c1.parts.positive.bisect('x', -length / 3, -15);

    // console.log(util.triangle.solve90SA({
    //     B: 75,
    //     b: 15
    // }));

    var mount = util.group();
    mount.add(union([c1.parts.negative,
        c2.parts.positive,
        p1.parts.positive
    ]).bisect('y', -8).parts.positive.color('orange'), 'left');

    var center = c2.parts.negative.enlarge(-1, 0, 0);

    mount.add(union([center,
        p2.parts.negative
    ]).bisect('y', 8).parts.negative.color('green'), 'right');

    var size = clamp.size();
    console.log('size', size);
    var cyl = Parts.Cylinder(20, size.y)
        .rotateX(90)
        .snap(clamp, 'x', 'inside-')
        .snap(clamp, 'z', 'outside-')
        .align(clamp, 'y')
        .bisect('y');

    // var cylbox = Parts.BBox(cyl);

    mount.add(union(cyl.parts.positive,
        Parts.BBox(cyl.parts.positive).bisect('z').parts.negative
    ).color('lightblue'), 'leftverticalpiviot');

    mount.add(union(cyl.parts.negative,
        Parts.BBox(cyl.parts.negative).bisect('z').parts.positive
    ).color('mediumblue'), 'rightverticalpiviot');

    mount.add(Parts.Cube([size.x, size.y, 5])
        .align(clamp, 'xy')
        .snap(mount.parts.rightverticalpiviot, 'z', 'outside-')
        .color('blue'), 'verticalplate', true);

    var azmount = Parts.Cylinder(120, 10)
        .snap(mount.parts.verticalplate, 'z', 'outside-')
        .snap(mount.parts.verticalplate, 'x', 'inside-');

    var azsize = azmount.size();

    var ring = Parts.Tube(azsize.y - 20, azsize.y - 40, 10).snap(azmount, 'z', 'outside+')
        .align(azmount, 'xy');

    var channel = ring
        .bisect('y', null, 20, 'z', null, {
            cutDelta: [0, 0, 0],
            rotationCenter: ring.centroid()
        })
        .parts.positive
        .bisect('y', null, -20, 'z', null, {
            cutDelta: [0, 0, 0],
            rotationCenter: ring.centroid()
        })
        .parts.negative;


    mount.add(ring
        .bisect('y', null, 10, 'z', null, {
            cutDelta: [0, 0, 0],
            rotationCenter: ring.centroid()
        })
        .parts.positive
        .bisect('y', null, -10, 'z', null, {
            cutDelta: [0, 0, 0],
            rotationCenter: ring.centroid()
        })
        .parts.negative
        .fillet(-2, 'z+'),
        'aztooth');

    var bolts = util.group();
    bolts.add(bolt14x1.clone(), 'bolt1', false, 'bolt1');
    bolts.add(bolt14x1.clone().translate([inch(1), 0, 0]), 'bolt2', false, 'bolt2');
    bolts.snap('bolt1head', azmount, 'z', 'inside-');
    bolts.align('bolt2head', azmount, 'xy')
        // console.log('bolt', bolts.parts);

    mount.add(bolt14x1.clone()
        .rotate(azmount, 'x', 180)
        .align('head', azmount, 'xy')
        .snap('head', azmount, 'z', 'inside+'),
        'azbolt', true, 'azbolt');

    mount.add(mount.parts.verticalplate
        .subtract(
            union(mount.parts.azboltclearance,
                channel
            )), 'azbase')

    var azmountholes = union(
        bolts.combine('bolt1clearance,bolt2clearance').translate([-inch(1), 0, 0]),
        mount.combine('azboltclearance')
        // bolt14x1.combine('clearance')
        // .rotateX(180)
        // .align(azmount, 'xy')
        // .snap(azmount, 'z', 'inside+')
    );

    var azclip = (azsize.y - size.y) / 2;

    mount.add(azmount.subtract(azmountholes)
        .bisect('y', azclip)
        .parts.negative
        .bisect('y', -azclip)
        .parts.positive
        .color('yellow'), 'azmount');

    return union([
        mount.combine()
    ]);

}

// ********************************************************
// Other jscad libraries are injected here.  Do not remove.
// Install jscad libraries using NPM
// ********************************************************
// include:js
// endinject
