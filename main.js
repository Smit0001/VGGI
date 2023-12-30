'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let light;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
    this.DrawLight = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let frustrum = 2
    let projection = m4.orthographic(-frustrum, frustrum, -frustrum, frustrum, -frustrum, frustrum);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, 0);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);
    let dC = document.getElementById('color').value
    let sC = document.getElementById('colorS').value
    gl.uniform3fv(shProgram.iDiffuseColor, hexToRgb(dC));
    gl.uniform3fv(shProgram.iSpecularColor, hexToRgb(sC));
    gl.uniform3fv(shProgram.iLightDir, [Math.cos(Date.now() * 0.001), 1, 1]);

    surface.Draw();
    light.BufferData([1, 1, 1, 1 + Math.cos(Date.now() * 0.001), 1 + 1, 1 + 1])
    gl.uniform3fv(shProgram.iLightDir, [0, 1, 1]);
    light.DrawLight()
}
function updateDraw() {
    draw()
    window.requestAnimationFrame(updateDraw)
}
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ]
}
function CreateSurfaceData() {
    let vertexList = [];
    let normalList = [];
    let step = parseFloat(document.getElementById('step').value)
    for (let i = 0; i < 1; i += step) {
        for (let j = 0; j < 360; j += 5) {
            vertexList.push(...CreateVertex(i, deg2rad(j)));
            vertexList.push(...CreateVertex(i + step, deg2rad(j)));
            vertexList.push(...CreateVertex(i, deg2rad(j + 5)));
            vertexList.push(...CreateVertex(i, deg2rad(j + 5)));
            vertexList.push(...CreateVertex(i + step, deg2rad(j)));
            vertexList.push(...CreateVertex(i + step, deg2rad(j + 5)));
            normalList.push(...facetAverage(i, deg2rad(j), step));
            normalList.push(...facetAverage(i + step, deg2rad(j), step));
            normalList.push(...facetAverage(i, deg2rad(j + 5), step));
            normalList.push(...facetAverage(i, deg2rad(j + 5), step));
            normalList.push(...facetAverage(i + step, deg2rad(j), step));
            normalList.push(...facetAverage(i + step, deg2rad(j + 5), step));
        }
    }

    return [vertexList, normalList];
}
function facetAverage(r, b, step) {
    let v0 = CreateVertex(r, b);
    let v1 = CreateVertex(r + step, b);
    let v2 = CreateVertex(r, b + 5);
    let v3 = CreateVertex(r - step, b + 5);
    let v4 = CreateVertex(r - step, b);
    let v5 = CreateVertex(r - step, b - 5);
    let v6 = CreateVertex(r, b - 5);
    let v01 = m4.subtractVectors(v1, v0)
    let v02 = m4.subtractVectors(v2, v0)
    let v03 = m4.subtractVectors(v3, v0)
    let v04 = m4.subtractVectors(v4, v0)
    let v05 = m4.subtractVectors(v5, v0)
    let v06 = m4.subtractVectors(v6, v0)
    let n1 = m4.normalize(m4.cross(v01, v02))
    let n2 = m4.normalize(m4.cross(v02, v03))
    let n3 = m4.normalize(m4.cross(v03, v04))
    let n4 = m4.normalize(m4.cross(v04, v05))
    let n5 = m4.normalize(m4.cross(v05, v06))
    let n6 = m4.normalize(m4.cross(v06, v01))
    let n = calculateAverage([n1, n2, n3, n4, n5, n6])
    n = m4.normalize(n);
    return n;
}
function calculateAverage(arr) {
    let avg = [0, 0, 0]
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < 3; j++) {
            avg[j] += arr[i][j]
        }
    }
    for (let j = 0; j < 3; j++) {
        avg[j] /= arr.length
    }
    return avg;
}
function update() {
    surface.BufferData(...CreateSurfaceData());
    draw();
}
const a = 0.1, n = 1, R = 0.1
function CreateVertex(r, b) {
    const x = r * Math.cos(b),
        y = r * Math.sin(b),
        z = a * Math.cos(n * Math.PI * r / R)
    return [x, y, z]
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iDiffuseColor = gl.getUniformLocation(prog, "diffuseColor");
    shProgram.iSpecularColor = gl.getUniformLocation(prog, "specularColor");
    shProgram.iLightDir = gl.getUniformLocation(prog, "lightDir");

    surface = new Model('Surface');
    surface.BufferData(...CreateSurfaceData());
    light = new Model()
    light.BufferData([0, 0, 0, 1, 1, 1])

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
    updateDraw()
}
