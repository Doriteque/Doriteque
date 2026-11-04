// admin/qrgen.js - Generador de códigos QR 100% local (sin internet ni servicios externos).
// Modo byte (UTF-8), versiones 1 a 10, niveles de corrección L/M/Q/H.
(function (global) {
    'use strict';

    const ECL = { L: 0, M: 1, Q: 2, H: 3 };
    const FORMAT_BITS = [1, 0, 3, 2]; // L, M, Q, H
    const MAX_VERSION = 10;

    const ECC_PER_BLOCK = [
        [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
        [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
        [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
        [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28]
    ];
    const NUM_BLOCKS = [
        [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
        [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
        [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
        [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8]
    ];

    function numRawDataModules(ver) {
        let r = (16 * ver + 128) * ver + 64;
        if (ver >= 2) {
            const na = Math.floor(ver / 7) + 2;
            r -= (25 * na - 10) * na - 55;
            if (ver >= 7) r -= 36;
        }
        return r;
    }

    function numDataCodewords(ver, ecl) {
        return Math.floor(numRawDataModules(ver) / 8) - ECC_PER_BLOCK[ecl][ver] * NUM_BLOCKS[ecl][ver];
    }

    function utf8Bytes(text) {
        return Array.from(new TextEncoder().encode(text));
    }

    // ---------- Reed-Solomon ----------
    function rsMultiply(x, y) {
        let z = 0;
        for (let i = 7; i >= 0; i--) {
            z = (z << 1) ^ ((z >>> 7) * 0x11D);
            z ^= ((y >>> i) & 1) * x;
        }
        return z;
    }

    function rsDivisor(degree) {
        const result = new Array(degree).fill(0);
        result[degree - 1] = 1;
        let root = 1;
        for (let i = 0; i < degree; i++) {
            for (let j = 0; j < result.length; j++) {
                result[j] = rsMultiply(result[j], root);
                if (j + 1 < result.length) result[j] ^= result[j + 1];
            }
            root = rsMultiply(root, 0x02);
        }
        return result;
    }

    function rsRemainder(data, divisor) {
        const result = divisor.map(() => 0);
        for (const b of data) {
            const factor = b ^ result.shift();
            result.push(0);
            divisor.forEach((coef, i) => { result[i] ^= rsMultiply(coef, factor); });
        }
        return result;
    }

    function addEccAndInterleave(data, ver, ecl) {
        const numBlocks = NUM_BLOCKS[ecl][ver];
        const blockEccLen = ECC_PER_BLOCK[ecl][ver];
        const rawCodewords = Math.floor(numRawDataModules(ver) / 8);
        const numShort = numBlocks - (rawCodewords % numBlocks);
        const shortLen = Math.floor(rawCodewords / numBlocks);
        const blocks = [];
        const div = rsDivisor(blockEccLen);
        for (let i = 0, k = 0; i < numBlocks; i++) {
            const dat = data.slice(k, k + shortLen - blockEccLen + (i < numShort ? 0 : 1));
            k += dat.length;
            const ecc = rsRemainder(dat, div);
            if (i < numShort) dat.push(0);
            blocks.push(dat.concat(ecc));
        }
        const result = [];
        for (let i = 0; i < blocks[0].length; i++) {
            blocks.forEach((block, j) => {
                if (i !== shortLen - blockEccLen || j >= numShort) result.push(block[i]);
            });
        }
        return result;
    }

    // ---------- Matriz ----------
    function getBit(x, i) { return ((x >>> i) & 1) !== 0; }

    function buildMatrix(codewords, ver, ecl) {
        const size = ver * 4 + 17;
        const modules = [];
        const isFn = [];
        for (let i = 0; i < size; i++) {
            modules.push(new Array(size).fill(false));
            isFn.push(new Array(size).fill(false));
        }

        function setFn(x, y, dark) {
            modules[y][x] = dark;
            isFn[y][x] = true;
        }

        function drawFinder(cx, cy) {
            for (let dy = -4; dy <= 4; dy++) {
                for (let dx = -4; dx <= 4; dx++) {
                    const dist = Math.max(Math.abs(dx), Math.abs(dy));
                    const x = cx + dx, y = cy + dy;
                    if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4);
                }
            }
        }

        function drawAlignment(cx, cy) {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
                }
            }
        }

        function alignPositions() {
            if (ver === 1) return [];
            const n = Math.floor(ver / 7) + 2;
            const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
            const res = [6];
            for (let pos = size - 7; res.length < n; pos -= step) res.splice(1, 0, pos);
            return res;
        }

        function drawFormat(mask) {
            const data = (FORMAT_BITS[ecl] << 3) | mask;
            let rem = data;
            for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
            const bits = ((data << 10) | rem) ^ 0x5412;
            for (let i = 0; i <= 5; i++) setFn(8, i, getBit(bits, i));
            setFn(8, 7, getBit(bits, 6));
            setFn(8, 8, getBit(bits, 7));
            setFn(7, 8, getBit(bits, 8));
            for (let i = 9; i < 15; i++) setFn(14 - i, 8, getBit(bits, i));
            for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, getBit(bits, i));
            for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, getBit(bits, i));
            setFn(8, size - 8, true);
        }

        function drawVersion() {
            if (ver < 7) return;
            let rem = ver;
            for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
            const bits = (ver << 12) | rem;
            for (let i = 0; i < 18; i++) {
                const c = getBit(bits, i);
                const a = size - 11 + (i % 3);
                const b = Math.floor(i / 3);
                setFn(a, b, c);
                setFn(b, a, c);
            }
        }

        // Patrones de función
        for (let i = 0; i < size; i++) {
            setFn(6, i, i % 2 === 0);
            setFn(i, 6, i % 2 === 0);
        }
        drawFinder(3, 3);
        drawFinder(size - 4, 3);
        drawFinder(3, size - 4);
        const ap = alignPositions();
        const na = ap.length;
        for (let i = 0; i < na; i++) {
            for (let j = 0; j < na; j++) {
                if (!((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0))) {
                    drawAlignment(ap[i], ap[j]);
                }
            }
        }
        drawFormat(0);
        drawVersion();

        // Datos
        let bitIdx = 0;
        for (let right = size - 1; right >= 1; right -= 2) {
            if (right === 6) right = 5;
            for (let vert = 0; vert < size; vert++) {
                for (let j = 0; j < 2; j++) {
                    const x = right - j;
                    const upward = ((right + 1) & 2) === 0;
                    const y = upward ? size - 1 - vert : vert;
                    if (!isFn[y][x] && bitIdx < codewords.length * 8) {
                        modules[y][x] = getBit(codewords[bitIdx >>> 3], 7 - (bitIdx & 7));
                        bitIdx++;
                    }
                }
            }
        }

        function applyMask(mask) {
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    let inv;
                    switch (mask) {
                        case 0: inv = (x + y) % 2 === 0; break;
                        case 1: inv = y % 2 === 0; break;
                        case 2: inv = x % 3 === 0; break;
                        case 3: inv = (x + y) % 3 === 0; break;
                        case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
                        case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break;
                        case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
                        default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
                    }
                    if (!isFn[y][x] && inv) modules[y][x] = !modules[y][x];
                }
            }
        }

        function penalty() {
            let result = 0;
            const lines = [];
            for (let y = 0; y < size; y++) lines.push(modules[y].slice());
            for (let x = 0; x < size; x++) {
                const col = [];
                for (let y = 0; y < size; y++) col.push(modules[y][x]);
                lines.push(col);
            }
            const pat = [true, false, true, true, true, false, true, false, false, false, false];
            const patR = pat.slice().reverse();
            for (const line of lines) {
                let run = 1;
                for (let i = 1; i < size; i++) {
                    if (line[i] === line[i - 1]) {
                        run++;
                        if (run === 5) result += 3;
                        else if (run > 5) result += 1;
                    } else run = 1;
                }
                for (let i = 0; i + 11 <= size; i++) {
                    let a = true, b = true;
                    for (let k = 0; k < 11; k++) {
                        if (line[i + k] !== pat[k]) a = false;
                        if (line[i + k] !== patR[k]) b = false;
                    }
                    if (a) result += 40;
                    if (b) result += 40;
                }
            }
            for (let y = 0; y < size - 1; y++) {
                for (let x = 0; x < size - 1; x++) {
                    const c = modules[y][x];
                    if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) result += 3;
                }
            }
            let dark = 0;
            for (const row of modules) for (const c of row) if (c) dark++;
            const total = size * size;
            const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
            result += Math.max(0, k) * 10;
            return result;
        }

        // Elegir la mejor máscara
        let best = 0, bestPen = Infinity;
        for (let m = 0; m < 8; m++) {
            applyMask(m);
            drawFormat(m);
            const p = penalty();
            if (p < bestPen) { best = m; bestPen = p; }
            applyMask(m); // deshacer
        }
        applyMask(best);
        drawFormat(best);
        return modules;
    }

    // ---------- API pública ----------
    function matrix(text, level) {
        const ecl = ECL[level || 'M'];
        if (ecl === undefined) throw new Error('Nivel de corrección inválido');
        const bytes = utf8Bytes(String(text));

        let ver = 1;
        for (; ver <= MAX_VERSION; ver++) {
            const ccBits = 8; // versiones 1-9 usan 8 bits (la 10 usa 16, se revisa abajo)
            const needed = 4 + (ver <= 9 ? ccBits : 16) + bytes.length * 8;
            if (needed <= numDataCodewords(ver, ecl) * 8) break;
        }
        if (ver > MAX_VERSION) throw new Error('El texto del QR es demasiado largo');

        const bits = [];
        const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
        push(0x4, 4);
        push(bytes.length, ver <= 9 ? 8 : 16);
        bytes.forEach(b => push(b, 8));

        const capBits = numDataCodewords(ver, ecl) * 8;
        push(0, Math.min(4, capBits - bits.length));
        push(0, (8 - (bits.length % 8)) % 8);
        for (let pad = 0xEC; bits.length < capBits; pad ^= 0xEC ^ 0x11) push(pad, 8);

        const data = [];
        for (let i = 0; i < bits.length; i += 8) {
            let v = 0;
            for (let k = 0; k < 8; k++) v = (v << 1) | bits[i + k];
            data.push(v);
        }
        return buildMatrix(addEccAndInterleave(data, ver, ecl), ver, ecl);
    }

    // Oscurece el color si es muy claro, para que el QR siempre se pueda escanear
    function colorOscuro(hex) {
        let h = String(hex || '#000000').replace('#', '');
        if (!/^[0-9a-fA-F]{6}$/.test(h)) h = '000000';
        let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
        const lum = () => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        while (lum() > 0.4) { r = Math.floor(r * 0.85); g = Math.floor(g * 0.85); b = Math.floor(b * 0.85); }
        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    // Dibuja el QR dentro de un cuadrado (x, y, size) de un canvas, con módulos nítidos
    function draw(ctx, text, x, y, size, color, bg, level) {
        const m = matrix(text, level || 'H');
        const n = m.length;
        const mod = Math.floor(size / n);
        const off = Math.floor((size - mod * n) / 2);
        ctx.fillStyle = bg || '#FFFFFF';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = colorOscuro(color);
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (m[r][c]) ctx.fillRect(x + off + c * mod, y + off + r * mod, mod, mod);
            }
        }
    }

    global.QRGen = { matrix: matrix, draw: draw, colorOscuro: colorOscuro };
})(window);