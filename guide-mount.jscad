// title      : vdoveplate
// author     : John Cole
// license    : ISC License
// file       : vdoveplate.jscad

/* exported main, getParameterDefinitions */
/* global Gears, console */
/*eslint no-console: ["error", { allow: ["info", "warn", "error"] }] */

// console.trace('main', include, self.relpath, e);

function getParameterDefinitions() {
    var parts = {
        left: 'left',
        right: 'right',
        azbase: 'azbase',
        azmount: 'azmount',
        verthandletop: 'vert handle top',
        verthandlebot: 'vert handle bot',
        azhandle_r: 'azmuth dial',
        vixen_dovetail: 'vixen dovetail',
        vixen110: 'ota',
        assembled: 'assembled'
    };

    return [
        {
            name: 'resolution',
            type: 'choice',
            values: [0, 1, 2, 3, 4],
            captions: ['very low (6,16)', 'low (8,24)', 'normal (12,32)', 'high (24,64)', 'very high (48,128)'],
            initial: 1,
            caption: 'Resolution:'
        },
        {
            name: 'length',
            type: 'int',
            caption: 'Length:',
            initial: 150
        },
        {
            name: 'part',
            type: 'choice',
            values: Object.keys(parts),
            captions: Object.keys(parts).map(function (key) {
                return parts[key];
            }),
            initial: 'assembled',
            caption: 'Part:'
        },
        {
            name: 'placeholder',
            type: 'checkbox',
            caption: 'Gear Placeholder:',
            checked: true
        },
        {
            name: 'printbom',
            type: 'checkbox',
            caption: 'Print BOM:',
            checked: false
        }
    ];
}

// function inch(x) {
//     return x * 25.4;
// }
// function cm(x) {
//     return x / 25.4;
// }
// /**
//  * Create a Losmondy style plate.
//  * Losmondy plate dimensions from https://stargazerslounge.com/topic/181088-losmandy-dovetail-dimensions/
//  * @param {number} length length of the plate
//  */
// function LPlate(length) {
//     var base = Parts.Cube([length, inch(2.95), inch(0.235)])
//         .bisect('y', 0, -30, 'x', 0)
//         .parts.negative
//         .bisect('y', -0, 30, 'x', 0)
//         .parts.positive
//         .Center();
//
//     var plate = Parts.Cube([length, inch(4), inch(0.265)])
//         .align(base, 'xy')
//         .snap(base, 'z', 'outside-');
//
//     return union([
//         base,
//         plate
//     ]).color('gray');
// }
function VPlate(length) {
    // vixen dimensions from http://www.ioptron.com/v/Manuals/8422-115_CAD.jpg
    var base = Parts.Cube([length, 44.5, 15]).bisect('y', 0, -15, 'x', 0).parts.negative.bisect(
            'y', -0,
            15,
            'x',
            0
        ).parts.positive
        .Center()
        .color('gray');

    return base;
}

function main(params) {
    // console.log('guide_mount', params);
    var resolutions = [[6, 16], [8, 24], [12, 32], [24, 64], [48, 128]];
    CSG.defaultResolution3D = resolutions[params.resolution][0];
    CSG.defaultResolution2D = resolutions[params.resolution][1];
    util.init(CSG);

    var inch = util.inch;
    var toImperial = util.cm;
    // var hole = Parts.Cylinder(inch(0.2660), inch(1));
    // var hole2 = Parts.Cylinder(inch(1 / 2), inch(7 / 32));
    // var base, halfdove, notch;
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
    // var foo = Parts.Hardware.PanHeadScrew(inch(0.48), inch(0.25) + inch(0.0625), inch(0.28125), inch(2), inch(1));
    //
    // console.log(foo.parts);
    // return foo.combine()
    // var boltsizes = {
    //     '1/4': {
    //         screwSize: inch(0.25),
    //         clearance: {
    //             close: (inch(17 / 64) - inch(0.25)) / 2,
    //             normal: (inch(9 / 32) - inch(0.25)) / 2,
    //             loose: (inch(19 / 64) - inch(0.25)) / 2
    //         }
    //     }
    // };
    // console.log('boltsizes', boltsizes);
    /**
     * http://www.americanfastener.com/cap-screws/
     * E - Body Diameter
     * F - Width Across Flats
     * G - Width Across Corners
     * H - Head Height
     * D - Head Diameter
     * @type {Object}
     */
    var boltsizes = {
        '1/4 hex': {
            E: inch(0.25),
            tap: inch(0.2010),
            close: inch(0.2570),
            loose: inch(0.2660),
            H: inch(5 / 32),
            G: inch(0.505),
            F: inch(7 / 16),
            type: 'HexHeadScrew'
        },
        '1/4 socket': {
            E: inch(0.25),
            tap: inch(0.2010),
            close: inch(0.2570),
            loose: inch(0.2660),
            H: inch(0.250),
            D: inch(0.375),
            type: 'PanHeadScrew'
        }
    };

    var Clearances = {
        tap: inch(-0.049),
        close: inch(0.007),
        loose: inch(0.016)
    };

    var BOM = {};

    function bolt(length, type, fit) {
        type = type || '1/4 hex';
        fit = fit || 'loose';
        var s = boltsizes[type];

        // Keep track of bolts for bill-of-materials
        var bomkey = `${type} - ${toImperial(length).toFixed(2)}`;
        if (!BOM[bomkey]) BOM[bomkey] = 0;
        BOM[bomkey]++;

        var b = Parts.Hardware[s.type](s.G || s.D, s.H, s.E, length);

        var clearance = s[fit] - s.E;

        b.add(
            Parts.Hardware[s.type]((s.G || s.D) + clearance, s.H + clearance, s[fit], length, length)
            .map(part => part.color('red')),
            'clearance',
            false,
            'clearance-'
        );

        return b;
    }

    function washer(type, clearance, fit) {
        var types = {
            vixen: {
                od: inch(0.465),
                id: inch(0.258),
                thickness: inch(0.061)
            }
        };

        var t = types[type];
        if (!t) throw new Error(`washer: unknown type: '${type}'`);
        var w = util.group();
        w.add(Parts.Tube(t.od, t.id, t.thickness).color('gray'), 'washer');
        if (clearance) {
            w.add(Parts.Cylinder(t.od + Clearances[fit], clearance).snap(w.parts.washer, 'z', 'inside+').color('red'), 'clearance');
        }
        return w;
    }

    var bolts = util.group();

    // add the bolts to another group for assembled view
    var vplate = VPlate(params.length).rotateY(180).Zero();

    var clampwidth = 25; // clamp width (y axis)
    var clampheight = 10; // clamp height over the vixen plate
    var clamp = Parts.BBox(vplate.enlarge(0, clampwidth, clampheight)).Zero();

    var p1 = clamp.subtract(vplate).bisect('y', 20);
    // split the clamp
    var p2 = p1.parts.negative.bisect('y', -20);
    // split the left side of the clamp
    var c1 = p2.parts.positive.bisect('x', params.length / 3, 15);
    // split the center 1/3 of the way
    var c2 = c1.parts.positive.bisect('x', (-params.length) / 3, -15);

    // split the center front
    /*
        L1 C1 R1 == p2- c2+ p1+
        L2 C2 R2 ==     c2-
        L3 C3 R3 ==     c1-
       */
    // center bolt
    var clampbolt = bolt(inch(3))
        .rotate(c2.parts.negative, 'x', 270)
        .align('head', c1.parts.negative, 'xz')
        .snap('head', clamp, 'y', 'inside-');

    bolts.add(clampbolt.combine('head,thread'), 'clampbolt');

    var clampbolt2 = clampbolt.clone()
        .align('head', c2.parts.positive, 'xz');
    bolts.add(clampbolt2.combine('head,thread'), 'clampbolt2');

    var mount = util.group();

    mount.add(
        union([c1.parts.negative, c2.parts.positive, p1.parts.positive]).bisect('y', -8).parts.positive
        .color('orange')
        .subtract([clampbolt.combine('clearance'), clampbolt2.combine('clearance')]),
        'left'
    );


    var center = c2.parts.negative.enlarge(-1, 0, 0);

    mount.add(
        union([center, p2.parts.negative]).bisect('y', 8).parts.negative
        .color('green')
        .subtract([clampbolt.combine('clearance'), clampbolt2.combine('clearance')]),
        'right'
    );

    var size = clamp.size();
    // console.log('size', size);
    var cyl = Parts
        .Cylinder(20, size.y)
        .rotateX(90)
        .snap(clamp, 'x', 'inside-')
        .snap(clamp, 'z', 'outside-')
        .align(clamp, 'y')
        .bisect('y');

    // var cylbox = Parts.BBox(cyl);
    var vertpivotbolt = bolt(inch(3))
        .rotate(cyl.parts.negative, 'x', 90)
        .align('head', cyl.parts.negative, 'xz')
        .snap('head', cyl.parts.negative, 'y', 'inside+');

    var cylsize = cyl.parts.positive.size();

    mount.add(
        union(
            cyl.parts.positive,
            //,
            // Parts.Cube([cylsize.x, cylsize.y, 2])
            // .align(cyl.parts.positive, 'xy')
            // .snap(cyl.parts.positive, 'z', 'outside+')
            // .fillet(-1.99, 'z-')
            Parts.BBox(cyl.parts.positive).bisect('z').parts.negative
        ).subtract(vertpivotbolt.combine('clearance')).subtract(cyl.parts.negative).color('orange'),
        'leftverticalpiviot'
    );

    bolts.add(vertpivotbolt.combine('head,thread'), 'vertpivotbolt');

    mount.add(
        union(
            cyl.parts.negative,
            //,
            // Parts.Cube([cylsize.x, cylsize.y, 2])
            // .align(cyl.parts.negative, 'xy')
            // .snap(cyl.parts.negative, 'z', 'outside-')
            // .fillet(-1.99, 'z+')
            Parts.BBox(cyl.parts.negative).bisect('z').parts.positive
        )
        .subtract([
            vertpivotbolt.parts.clearance, cyl.parts.positive
          ])
        .color('blue'),
        'rightverticalpiviot'
    );

    mount.add(
        Parts
        .Board(size.x, size.y, 2, 10)
        .align(clamp, 'xy')
        .snap(mount.parts.rightverticalpiviot, 'z', 'outside-')
        .color('blue'),
        'verticalplate',
        true
    );

    var azmount = Parts
        .Cylinder(120, 20)
        .snap(mount.parts.verticalplate, 'z', 'outside-')
        .snap(mount.parts.verticalplate, 'x', 'inside-');

    var azsize = azmount.size();
    var toothoffset = cylsize.x * 2 + 5;

    var ring = Parts
        .Tube(azsize.x - toothoffset, azsize.y - (toothoffset + 20), 20)
        .snap(azmount, 'z', 'outside+')
        .align(azmount, 'xy');

    var azposition = -1; // 1 = rear, -1 = front
    var channel = ring.bisect('y', null, -15 * azposition, 'z', null, {
        cutDelta: [0, 0, 0],
        rotationCenter: ring.centroid()
    }).parts.positive.bisect('y', null, 15 * azposition, 'z', null, {
        cutDelta: [0, 0, 0],
        rotationCenter: ring.centroid()
    }).parts.negative;

    var toothgap = 2;

    function tooth(azposition) {
        return Parts
            .Tube(azsize.x - (toothoffset + toothgap), azsize.y + toothgap - (toothoffset + 20), 20)
            .snap(azmount, 'z', 'outside+')
            .align(azmount, 'xy')
            .bisect('y', null, -5 * azposition, 'z', null, {
                cutDelta: [0, 0, 0],
                rotationCenter: ring.centroid()
            }).parts.positive.bisect('y', null, 5 * azposition, 'z', null, {
                cutDelta: [0, 0, 0],
                rotationCenter: ring.centroid()
            }).parts.negative
            .fillet(-4, 'z+');
    }

    var fronttooth = tooth(-1);
    var reartooth = tooth(1);
    mount.add(
        azposition == -1 ? fronttooth : reartooth,
        'aztooth'
    );

    var scopebolts = util.group();
    scopebolts.add(bolt(inch(1), '1/4 socket'), 'bolt1', false, 'bolt1');
    scopebolts.add(bolt(inch(1), '1/4 socket').translate([inch(0.975), 0, 0]), 'bolt2', false, 'bolt2');


    scopebolts.add(washer('vixen', inch(1), 'loose')
        .snap('washer', scopebolts.parts.bolt1head, 'z', 'outside-'), 'washer1', true, 'washer1-');
    scopebolts.add(washer('vixen', inch(1), 'loose')
        .snap('washer', scopebolts.parts.bolt2head, 'z', 'outside-')
        .align('washer', scopebolts.parts.bolt2head, 'xy'), 'washer2', true, 'washer2-');
    scopebolts.snap('bolt1head', azmount, 'z', 'inside-');

    // scopebolts.align('bolt1head,bolt2head', mount.parts.aztooth, 'xy');
    scopebolts.align('bolt1head,bolt2head', reartooth, 'xy');

    mount.add(
        bolt(inch(1.5))
        .rotate(azmount, 'x', 180)
        .align('head', azmount, 'xy')
        .snap('head', azmount, 'z', 'inside+'),
        'azbolt',
        true,
        'azbolt'
    );

    bolts.add(mount.combine('azbolthead,azboltthread'), 'azbolt');

    mount.add(mount.parts.verticalplate
        .subtract(
            union([
              mount.parts.azboltclearance
                .intersect(mount.parts.verticalplate)
                .chamfer(-1, 'z+')
                .chamfer(-1, 'z-'),
              channel.fillet(-4, 'z+')
            ])), 'azbase');

    var azmountholes = union(
        scopebolts.combine('bolt1clearance,bolt2clearance'),
        scopebolts.combine('washer1-clearance,washer2-clearance'),
        mount.combine('azboltclearance')
    );


    bolts.add(scopebolts.combine('bolt1head,bolt1thread,bolt2head,bolt2thread'), 'scopebolts');

    var azclip = (azsize.y - size.y) / 2;
    mount.add(azmount
        .intersect(
            azmount.bisect('y', azclip).parts.negative.bisect('y', -azclip).parts.positive.translate([-19, 0, 0])
        ), 'azmount-base', true);

    mount.add(
        mount.parts['azmount-base']
        .union(mount.parts.aztooth)
        .subtract(azmountholes)
        .color('yellow'),
        'azmount'
    );

    var nut = Parts.Hexagon(12.5, 5.6).color('darkgray');
    var azadj = util.group();

    azadj.add(
        bolt(inch(2), '1/4 hex', 'close')
        .rotate(mount.parts.aztooth, 'x', 90)
        .align('head', mount.parts.aztooth, 'x')
        // .align('head', azadj.parts.nut, 'xz')
        .snap('clearance-thread', mount.parts.aztooth, 'y', 'outside-')
        .snap('clearance-thread', mount.parts.verticalplate, 'z', 'outside+')
        .translate([0, 0, 2.5]),
        'bolt',
        false,
        'bolt'
    );

    azadj.add(
        nut
        .rotateX(90)
        .rotateY(30)
        .enlarge([0.5, 0.5, 0.5])
        .align(azadj.parts.bolt, 'xz')
        .snap(mount.parts.azbase, 'y', 'inside+')
        // .snap(mount.parts.azbase, 'z', 'outside+')
        .translate([0, -7, 0])
        .color('pink'),
        'nut'
    );


    azadj.add(
        Parts
        .Cube([25, 20, 7.5])
        .align(azadj.parts.nut, 'xy')
        // .snap(azadj.parts.nut, 'y', 'outside-')
        .snap(mount.parts.azbase, 'z', 'outside+')
        .bisect('x', -0, 30, 'y', -0).parts.negative
        .bisect('x', 0, -30, 'y', -0).parts.positive,
        'bracket1'
    );

    mount.add(
        azadj
        .combine('bracket1')
        .subtract([
          // azadj.parts.boltclearance.enlarge([1, 0, 1]),
          Boxes.BBox(azadj.parts.nut)
            .stretch('z', 10)
            .snap(azadj.parts.nut, 'z', 'inside+')
            .translate([0, 0, -util.size(azadj.parts.nut).z / 2]),
            channel
          ]),
        'azadj_r'
    );

    mount.add(
        mount.parts.azadj_r
        .mirroredY(),
        // .bisect('x', 0, -30, 'y', -0).parts.positive
        // .subtract(
        //     mount.parts.leftverticalpiviot
        //     .enlarge([1, 1, 1])
        //     .rotate(bolts.parts.vertpivotbolt.centroid(), util.rotationAxes.y, -15)
        // ),
        'azadj_l'
    );

    // return [mount.parts.verticalplate, mount.parts.aztooth,
    // mount.parts.azadj_r, mount.parts.azadj_l];

    bolts.add(azadj.combine('bolthead,boltthread,nut'), 'azbolt_r');
    bolts.add(bolts.parts.azbolt_r.mirroredY(), 'azbolt_l');

    bolts.add(
        bolt(inch(2.0))
        .snap('head', vplate, 'z', 'outside-')
        .snap('head', mount.parts.verticalplate, 'x', 'inside+')
        .align('head', mount.parts.verticalplate, 'y')
        .translate([-5, 0, 0]),
        'vertbolt',
        false,
        'vertbolt',
        'head,thread'
    );

    bolts.add(nut.align(bolts.parts.vertbolt, 'xy').snap(clamp, 'z', 'outside-'), 'vertbolt_nut1');

    bolts.add(
        bolts.parts.vertbolt_nut1.snap(mount.parts.verticalplate, 'z', 'outside+').translate([0, 0, -2]),
        'vertbolt_nut2'
    );
    bolts.add(
        bolts.parts.vertbolt_nut1.snap(mount.parts.verticalplate, 'z', 'outside-').translate([0, 0, 2]),
        'vertbolt_nut3'
    );

    // var handle = Gears.involuteGear({
    //     thickness: 6,
    //     outerRadius: 35,
    //     baseRadius: 34,
    //     circularPitch: 1
    // });
    //
    // mount.add(
    //     handle
    //     .align(bolts.parts.vertbolthead, 'xy')
    //     .snap(mount.parts.verticalplate, 'z', 'outside-')
    //     .color('lightgreen'), 'handle');
    //
    // mount.add(mount.parts.handle
    //     .snap(mount.parts.verticalplate, 'z', 'outside+'), 'handle2');
    // console.log(bolts.parts);
    function scope(part, bolts) {
        var scope = util.group();
        scope.add(Parts.Cube([52, 27, 5])
            .align(bolts, 'xy')
            // .snap(part, 'x', 'inside-')
            .snap(part, 'z', 'outside-'), 'mount');

        scope.add(Parts.Cylinder(119 + 7, 58)
            .rotateY(90)
            .snap(scope.parts.mount, 'z', 'outside-')
            .snap(scope.parts.mount, 'x', 'inside+')
            .translate([0, 0, -5])
            .color('white'), 'base');

        scope.add(Parts.Cylinder(119, 370 - 58 - 56)
            .rotateY(90)
            .align(scope.parts.base, 'yz')
            .snap(scope.parts.base, 'x', 'outside-')
            .color('gray'), 'tube');

        scope.add(Parts.Cylinder(125, 56)
            .rotateY(90)
            .align(scope.parts.base, 'yz')
            .snap(scope.parts.tube, 'x', 'outside-')
            .color('black'), 'front');

        return scope.combine();
    }

    var parts = {
        altitudedial: function () {
            return Gears[params.placeholder ? 'placeHolder' : 'involuteGear']({
                    thickness: 6,
                    outerRadius: 35,
                    baseRadius: 34,
                    circularPitch: 1
                })
                .align(bolts.parts.vertbolthead, 'xy')
                .snap(mount.parts.verticalplate, 'z', 'outside-')
                .color('lightgreen');
        },
        azmuthdial: function () {
            return Gears[params.placeholder ? 'placeHolder' : 'involuteGear']({
                    thickness: inch(3 / 8),
                    outerRadius: inch(3 / 4),
                    baseRadius: inch(3 / 4) - 1,
                    circularPitch: 1
                })
                .rotateX(90)
                .align(bolts.parts.azbolt_r, 'xz')
                .snap(azadj.parts.bolthead, 'y', 'inside+')
                // .translate([0, -1, 0])
                .color('lightgreen')
                .subtract([
                  azadj.parts.bolthead,
                  azadj.parts['boltclearance-thread'].enlarge(0, 1, 0)]);
        },
        left: function () {
            var level = Parts.Cube([0.8, 5, 0.8])
                .align(vertpivotbolt.parts.thread, 'z')
                .snap(mount.parts.leftverticalpiviot, 'x', 'outside+')
                .snap(mount.parts.leftverticalpiviot, 'y', 'inside+');

            return mount.combine('left,leftverticalpiviot')
                .subtract(bolts.combine('vertboltclearance'))
                .union(level);
            // .union(bolts.combine('vertbolt'));
        },
        right: function () {
            return mount.combine('right');
        },
        azbase: function () {
            var a = mount
                .combine('rightverticalpiviot,azbase,azadj_l,azadj_r');

            var level = Parts.Cube([0.8, 5, 0.8])
                .align(vertpivotbolt.parts.thread, 'z')
                .snap(mount.parts.rightverticalpiviot, 'x', 'outside+')
                .snap(mount.parts.rightverticalpiviot, 'y', 'inside-');
            var vlevel = Parts.Cube([0.8, 0.8, 5])
                .align(mount.parts.azbase, 'y')
                .snap(mount.parts.azbase, 'x', 'outside+')
                .snap(mount.parts.azbase, 'z', 'inside+');

            return a
                .subtract([
                  bolts.parts.vertbolt
                    .stretch('x', 5)
                    .align(bolts.parts.vertbolt, 'xy')
                    .intersect(a)
                    .enlarge([1, 1, 0])
                    .chamfer(-1, 'z+')
                    .chamfer(-1, 'z-'),
                  azadj.parts.nut,
                  azadj.parts.nut.mirroredY(),
                  azadj.parts.bolt,
                  azadj.parts.bolt.mirroredY(),
                  vertpivotbolt.parts.clearance
                ]).union([level, vlevel]);
        },
        azmount: function () {
            var a = mount.parts.azmount;
            var base = mount.parts['azmount-base'];
            var vlevel = Parts.Cube([0.8, 0.8, 5])
                .align(base, 'y')
                .snap(base, 'x', 'outside+')
                .snap(base, 'z', 'inside-');

            return [a, vlevel];
        },
        verthandletop: function (dial) {
            dial = dial || parts.altitudedial();
            return dial.subtract(union(bolts.combine('vertboltclearance'), bolts.parts.vertbolt_nut3));
        },
        verthandlebot: function (dial) {
            dial = dial || parts.altitudedial();
            return dial
                .snap(mount.parts.verticalplate, 'z', 'outside+')
                .subtract(union(bolts.combine('vertboltclearance'), bolts.parts.vertbolt_nut2));
        },
        azhandle_r: function (dial) {
            return dial || parts.azmuthdial();
        },
        vixen110: function (part, bolts) {
            return scope(part || parts.azmount(), bolts || scopebolts.combine());
        },
        vixen_dovetail: function () {
            var v = VPlate(params.length);
            var b = bolt(20, '1/4 hex')
                .rotate(v, 'x', 180)
                .align('thread', v, 'xy')
                .snap('head', v, 'z', 'inside+');

            // console.log(Object.keys(scopebolts.clone().parts))
            var sbolts = scopebolts
                .clone()
                .snap('bolt1', v, 'z', 'inside-')
                .align('bolt1,bolt2', v.bisect('x').parts.negative, 'x')
                .combine('bolt1clearance-thread,bolt2clearance-thread,washer1-clearance,washer2-clearance', undefined, function (part, name) {
                    return part
                        .intersect(v)
                        .chamfer(-1, 'z+')
                        .chamfer(-1, 'z-');
                });

            // return sbolts;
            return v.subtract([
              nut
              .enlarge(0, 0, 3)
              .align(v, 'xy')
              .snap(v, 'z', 'inside+'),
              b.parts['clearance-thread'].intersect(v).chamfer(-1, 'z-'),
              sbolts
            ]);

        },
        assembled: function () {
            var dial = parts.altitudedial();
            var azdial = parts.azhandle_r();
            var azmount = parts.azmount();
            return union([
                parts.left(),
                // parts.right(),
                parts.azbase(),
                azmount,
                // bolts.combine(),
                // parts.verthandletop(dial),
                // parts.verthandlebot(dial),
                // azdial,
                // azdial.mirroredY(),
                // azadj.combineAll(),
                // scopebolts.combine(),
                // parts.vixen110(azmount, scopebolts.combine())
            ]);
        }
    };

    var part = parts[params.part]();

    if (params.printbom) {
        console.info('BOM:');
        Object.keys(BOM).forEach(function (key) {
            console.info(`${key} inch: ${BOM[key]}`);
        });
    }
    // console.log('done');
    return part;
}
// ********************************************************
// Other jscad libraries are injected here.  Do not remove.
// Install jscad libraries using NPM
// ********************************************************
// include:js
// endinject