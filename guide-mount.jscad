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

    var bolts = util.group(); // add the bolts to another group for assembled view

    var vplate = VPlate(length).rotateY(180).Zero();

    var clamp = Parts.BBox(vplate.enlarge(0, 20, 15)).Zero();

    var p1 = clamp.subtract(vplate).bisect('y', 20);
    var p2 = p1.parts.negative.bisect('y', -20);

    var c1 = p2.parts.positive.bisect('x', length / 3, 15);
    var c2 = c1.parts.positive.bisect('x', -length / 3, -15);

    // console.log(util.triangle.solve90SA({
    //     B: 75,
    //     b: 15
    // }));
    var clampbolt = bolt(inch(2.5))
        .rotate(c2.parts.negative, 'x', 90)
        .align('head', c2.parts.negative, 'xz')
        .snap('head', clamp, 'y', 'inside+');

    var mount = util.group();
    mount.add(union([c1.parts.negative,
            c2.parts.positive,
            p1.parts.positive
        ]).bisect('y', -8).parts.positive
        .color('orange')
        .subtract(clampbolt.combine('clearance')), 'left');

    bolts.add(clampbolt.combine('head,thread'), 'clampbolt');

    var center = c2.parts.negative.enlarge(-1, 0, 0);

    mount.add(union([center,
            p2.parts.negative
        ]).bisect('y', 8).parts.negative
        .color('green')
        .subtract(clampbolt.combine('clearance')), 'right');

    var size = clamp.size();
    console.log('size', size);
    var cyl = Parts.Cylinder(20, size.y)
        .rotateX(90)
        .snap(clamp, 'x', 'inside-')
        .snap(clamp, 'z', 'outside-')
        .align(clamp, 'y')
        .bisect('y');

    // var cylbox = Parts.BBox(cyl);
    var vertpivotbolt = bolt(inch(2.5))
        .rotate(cyl.parts.negative, 'x', 90)
        .align('head', cyl.parts.negative, 'xz')
        .snap('head', cyl.parts.negative, 'y', 'inside+');

    mount.add(union(cyl.parts.positive,
            Parts.BBox(cyl.parts.positive)
            .bisect('z').parts.negative
        )
        .subtract(vertpivotbolt.combine('clearance'))
        .color('lightblue'), 'leftverticalpiviot');

    bolts.add(vertpivotbolt.combine('head,thread'), 'vertpivotbolt');

    mount.add(union(cyl.parts.negative,
            Parts.BBox(cyl.parts.negative)
            .bisect('z').parts.positive
        )
        .subtract(vertpivotbolt.combine('clearance'))
        .color('mediumblue'), 'rightverticalpiviot');

    mount.add(Parts.Cube([size.x, size.y, 5])
        .align(clamp, 'xy')
        .snap(mount.parts.rightverticalpiviot, 'z', 'outside-')
        .color('blue'), 'verticalplate', true);

    var azmount = Parts.Cylinder(120, 10)
        .snap(mount.parts.verticalplate, 'z', 'outside-')
        .snap(mount.parts.verticalplate, 'x', 'inside-');

    var azsize = azmount.size();

    var ring = Parts.Tube(azsize.y - 25, azsize.y - 45, 15).snap(azmount, 'z', 'outside+')
        .align(azmount, 'xy');

    var channel = ring
        .bisect('y', null, 15, 'z', null, {
            cutDelta: [0, 0, 0],
            rotationCenter: ring.centroid()
        })
        .parts.positive
        .bisect('y', null, -15, 'z', null, {
            cutDelta: [0, 0, 0],
            rotationCenter: ring.centroid()
        })
        .parts.negative;


    mount.add(ring
        .bisect('y', null, 5, 'z', null, {
            cutDelta: [0, 0, 0],
            rotationCenter: ring.centroid()
        })
        .parts.positive
        .bisect('y', null, -5, 'z', null, {
            cutDelta: [0, 0, 0],
            rotationCenter: ring.centroid()
        })
        .parts.negative
        .fillet(-2, 'z+'),
        'aztooth');


    var scopebolts = util.group();
    scopebolts.add(bolt14x1.clone(), 'bolt1', false, 'bolt1');
    scopebolts.add(bolt14x1.clone().translate([inch(1), 0, 0]), 'bolt2', false, 'bolt2');
    scopebolts.snap('bolt1head', azmount, 'z', 'inside-');
    scopebolts.align('bolt2head', azmount, 'xy');
    // console.log('bolt', scopebolts.parts);

    mount.add(bolt(inch(5 / 8))
        .rotate(azmount, 'x', 180)
        .align('head', azmount, 'xy')
        .snap('head', azmount, 'z', 'inside+'),
        'azbolt', true, 'azbolt');

    bolts.add(mount.combine('azbolthead,azboltthread'), 'azbolt');

    mount.add(mount.parts.verticalplate
        .subtract(
            union(mount.parts.azboltclearance,
                channel
            )), 'azbase');

    var azmountholes = union(
        scopebolts.combine('bolt1clearance,bolt2clearance').translate([-inch(1), 0, 0]),
        mount.combine('azboltclearance')
    );

    bolts.add(scopebolts.combine('bolt1head,bolt1thread,bolt2head,bolt2thread')
        .translate([-inch(1), 0, 0]), 'scopebolts');

    var azclip = (azsize.y - size.y) / 2;

    mount.add(azmount.subtract(azmountholes)
        .bisect('y', azclip)
        .parts.negative
        .bisect('y', -azclip)
        .parts.positive
        .color('yellow'), 'azmount');

    var nut = Parts.Hexagon(12.3, 4.75).color('darkgray');
    var aznut = util.group();
    aznut.add(nut.rotateX(90)
        .align(mount.parts.aztooth, 'x')
        .snap(mount.parts.azbase, 'y', 'inside+')
        .snap(mount.parts.aztooth, 'z', 'inside-')
        .translate([0, -7, 0]), 'nut');

    aznut.add(bolt(inch(1.5))
        .rotate(aznut.parts.nut, 'x', 90)
        .align('head', aznut.parts.nut, 'xz')
        .snap('thread', mount.parts.aztooth, 'y', 'outside-'),
        'bolt', false, 'bolt');

    aznut.add(Parts.Cylinder(11, 5)
        .rotateX(90)
        .align(aznut.parts.nut, 'xz')
        .snap(aznut.parts.nut, 'y', 'outside-'), 'bracket1');

    aznut.add(aznut.parts.bracket1
        .snap(aznut.parts.nut, 'y', 'outside+'), 'bracket2');

    var aznutsize = aznut.combine('bracket1,bracket2').size();

    aznut.add(Parts.Cube([aznutsize.x, aznutsize.y, aznutsize.z / 2])
        .snap(mount.parts.azbase, 'z', 'outside+')
        .align(aznut.parts.nut, 'xy')
        .fillet(-2, 'z+'),
        'base');

    mount.add(aznut.combine('base,bracket1,bracket2')
        .subtract(aznut.combine('boltclearance,nut')), 'aznut_r');

    mount.add(mount.parts.aznut_r.mirroredY(), 'aznut_l');

    bolts.add(aznut.combine('bolthead,boltthread,nut'), 'azbolt_r');
    bolts.add(bolts.parts.azbolt_r.mirroredY(), 'azbolt_l');


    var vertbolt = bolt(inch(1.25))
        .rotate(clamp, 'x', 180)
        .snap('head', mount.parts.verticalplate, 'z', 'outside+')
        .snap('head', mount.parts.verticalplate, 'x', 'inside+');

    return union([
        nut.align(vertbolt.parts.head, 'xy').snap(clamp, 'z', 'outside-'),
        vertbolt.combine(),
        // aznut.combine(),
        // mount.combine('azbase,aznut-r'),
        mount.combine(),
        bolts.combine()
    ]);

}

// ********************************************************
// Other jscad libraries are injected here.  Do not remove.
// Install jscad libraries using NPM
// ********************************************************
// include:js
// endinject
