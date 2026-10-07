const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/google-chrome-stable',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

const ARCHIVO_USUARIOS = './db_usuarios.json';
const ARCHIVO_MERCADO = './db_mercado.json';
const ARCHIVO_RAID = './db_raid.json';
const ARCHIVO_GREMIOS = './db_gremios.json';

// Cargar bases de datos persistentes
let usuarios = {};
if (fs.existsSync(ARCHIVO_USUARIOS)) {
    usuarios = JSON.parse(fs.readFileSync(ARCHIVO_USUARIOS, 'utf8'));
}

let mercado = [];
if (fs.existsSync(ARCHIVO_MERCADO)) {
    mercado = JSON.parse(fs.readFileSync(ARCHIVO_MERCADO, 'utf8'));
}

let raidBoss = { 
    nombre: "Dragón de Magma Ancestral", 
    hpMax: 5000, 
    hpActual: 5000, 
    activo: true 
};
if (fs.existsSync(ARCHIVO_RAID)) {
    raidBoss = JSON.parse(fs.readFileSync(ARCHIVO_RAID, 'utf8'));
}

let gremios = {};
if (fs.existsSync(ARCHIVO_GREMIOS)) {
    gremios = JSON.parse(fs.readFileSync(ARCHIVO_GREMIOS, 'utf8'));
}

function guardarTodo() {
    fs.writeFileSync(ARCHIVO_USUARIOS, JSON.stringify(usuarios, null, 2));
    fs.writeFileSync(ARCHIVO_MERCADO, JSON.stringify(mercado, null, 2));
    fs.writeFileSync(ARCHIVO_RAID, JSON.stringify(raidBoss, null, 2));
    fs.writeFileSync(ARCHIVO_GREMIOS, JSON.stringify(gremios, null, 2));
}

// Función auxiliar para comparar jerarquía de rangos
function pesoRango(rango) {
    if (rango === "Novato") return 1;
    if (rango === "Oficial") return 2;
    if (rango === "Maestro") return 3;
    if (rango === "Leyenda") return 4;
    return 1;
}

// Función para actualizar el rango según el nivel del usuario
function actualizarRango(u) {
    if (u.nivel <= 20) {
        u.rango = "Novato";
    } else if (u.nivel <= 50) {
        u.rango = "Oficial";
    } else if (u.nivel <= 80) {
        u.rango = "Maestro";
    } else {
        u.rango = "Leyenda";
    }
}

// Generador de misiones personales por rango
function generarMisionPorRango(rangoReq, id) {
    let desc = "";
    let xp = 0;
    let dinero = 0;

    if (rangoReq === "Novato") {
        const descNovato = [
            "Despejar la cueva infestada de Arañas Gigantes",
            "Eliminar jauría de Lobos Rabiosos en el camino real",
            "Cazar Murciélagos Vampiro en las ruinas abandonadas",
            "Recolectar hongos venenosos custodiados por Mandrágoras"
        ];
        desc = descNovato[Math.floor(Math.random() * descNovato.length)];
        xp = Math.floor(Math.random() * 50) + 50;
        dinero = Math.floor(Math.random() * 40) + 60;
    } else if (rangoReq === "Oficial") {
        const descOficial = [
            "Derrotar a los Esqueletos Errantes de la Cripta",
            "Cazar Trolls de las Cavernas Profundas",
            "Repeler incursión de Harpías en el cañón del viento",
            "Desarticular campamento de Bandidos Renegados"
        ];
        desc = descOficial[Math.floor(Math.random() * descOficial.length)];
        xp = Math.floor(Math.random() * 150) + 250;
        dinero = Math.floor(Math.random() * 200) + 350;
    } else if (rangoReq === "Maestro") {
        const descMaestro = [
            "Derrotar al Caballero Oscuro de la Espada Maldita",
            "Someter al Wyvern de las Montañas Abruptas",
            "Cazar al Dragón Anciano de las Cenizas",
            "Eliminar al Golem de Roca Colosal"
        ];
        desc = descMaestro[Math.floor(Math.random() * descMaestro.length)];
        xp = Math.floor(Math.random() * 300) + 600;
        dinero = Math.floor(Math.random() * 500) + 900;
    } else {
        const descLeyenda = [
            "Derrotar al Rey Demonio en las Puertas del Abismo",
            "Cazar al Titán de Magma Primordial",
            "Someter al Dios Dragón de las Tormentas Eternas",
            "Purificar al Arcángel Caído en el Sanctasanctorum"
        ];
        desc = descLeyenda[Math.floor(Math.random() * descLeyenda.length)];
        xp = Math.floor(Math.random() * 500) + 1000;
        dinero = Math.floor(Math.random() * 1000) + 1800;
    }

    return { id, desc, rangoReq, xp, dinero };
}

// Función para calcular y actualizar la energía
function actualizarEnergia(u) {
    if (u.energia === undefined) u.energia = 100;
    if (u.ultimoTiempoEnergia === undefined) u.ultimoTiempoEnergia = Date.now();

    const ahora = Date.now();
    let tiempoMaxRecarga = 5 * 60 * 1000; // 5 minutos base

    if (u.raza && (u.raza.toLowerCase() === "no-muerto" || u.raza.toLowerCase() === "súcubo" || u.raza.toLowerCase() === "sucubo")) {
        tiempoMaxRecarga = 4 * 60 * 1000;
    }

    const tiempoTranscurrido = ahora - u.ultimoTiempoEnergia;

    if (tiempoTranscurrido > 0) {
        const puntosGanados = (tiempoTranscurrido / tiempoMaxRecarga) * 100;
        u.energia = Math.min(100, u.energia + puntosGanados);
        u.ultimoTiempoEnergia = ahora;
    }
}

// Función para verificar subida de nivel
function checarSubidaNivel(u) {
    if (u.nivel === undefined) u.nivel = 1;
    let nivelAnterior = u.nivel;
    u.nivel = Math.floor(u.xp / 100) + 1;
    actualizarRango(u);

    if (u.nivel > nivelAnterior) {
        let nivelesSubidos = u.nivel - nivelAnterior;
        let bonusDinero = nivelesSubidos * 50;
        u.dinero += bonusDinero;
        u.energia = 100;
        return { subio: true, nivelesSubidos, bonusDinero };
    }
    return { subio: false };
}

client.on('qr', (qr) => {
    console.log('Escanea el código QR:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('¡Bot RPG en línea con bodas interactivas, duelos de 5 min y expediciones de hasta 1 hora!');
});

client.on('message', async (message) => {
    const texto = message.body.trim();
    const numeroUser = message.author || message.from;

    if (!usuarios[numeroUser]) {
        usuarios[numeroUser] = { 
            nombre: "Aventurero Sin Nombre",
            genero: "No especificado",
            edad: "Desconocida",
            raza: "Humano",
            pareja: null,
            propuestaDe: null, // NUEVO: Control de propuestas de matrimonio pendientes
            energia: 100,
            ultimoTiempoEnergia: Date.now(),
            ultimoTrabajo: 0,
            ultimoGacha: 0,
            ultimoDuelo: 0,
            xp: 0, 
            nivel: 1,
            dinero: 100, 
            rango: "Novato", 
            inventario: [],
            pocionesEnergia: 0,
            gremio: null,
            mascota: null,
            expedicion: null,
            ultimoDiario: null,
            rachaDiaria: 0,
            misMisiones: [],
            creandoPaso: undefined,
            tempNombre: undefined,
            tempGenero: undefined,
            tempEdad: undefined
        };
        guardarTodo();
    }

    let u = usuarios[numeroUser];
    
    // ASISTENTE INTERACTIVO DE CREACIÓN DE PERSONAJE PASO A PASO
    if (u.creandoPaso && !texto.startsWith('.')) {
        if (u.creandoPaso === 1) {
            u.tempNombre = texto;
            u.creandoPaso = 2;
            guardarTodo();
            return message.reply(
                `📜 *CREACIÓN DE PERSONAJE (PASO 2/4)*\n\n` +
                `Nombre registrado: *${u.tempNombre}*\n\n` +
                `Ahora, escribe el *Género* de tu personaje (Ej: Masculino, Femenino, No binario):`
            );
        } else if (u.creandoPaso === 2) {
            u.tempGenero = texto;
            u.creandoPaso = 3;
            guardarTodo();
            return message.reply(
                `📜 *CREACIÓN DE PERSONAJE (PASO 3/4)*\n\n` +
                `Ahora, escribe la *Edad* de tu personaje (Ej: 21, 150):`
            );
        } else if (u.creandoPaso === 3) {
            u.tempEdad = texto;
            u.creandoPaso = 4;
            guardarTodo();
            return message.reply(
                `📜 *CREACIÓN DE PERSONAJE (PASO 4/4 - ÚLTIMO PASO)*\n\n` +
                `Elige tu *Raza* respondiendo exactamente con una de estas opciones:\n` +
                `• \`Humano\` (+20% oro)\n` +
                `• \`Elfo\` (+15% XP)\n` +
                `• \`Enano\` (Mejor gacha)\n` +
                `• \`Orco\` (+10 Poder de Batalla)\n` +
                `• \`No-muerto\` (Energía rápida)\n` +
                `• \`Sucubo\` (Energía rápida + intimar bonus)`
            );
        } else if (u.creandoPaso === 4) {
            const razaElegida = texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
            const razasValidas = ["Humano", "Elfo", "Enano", "Orco", "No-muerto", "Sucubo", "Súcubo"];
            
            if (!razasValidas.includes(razaElegida)) {
                return message.reply(`❌ Raza no válida. Responde exactamente con una opción: Humano, Elfo, Enano, Orco, No-muerto, Sucubo.`);
            }

            u.nombre = u.tempNombre;
            u.genero = u.tempGenero;
            u.edad = u.tempEdad;
            u.raza = razaElegida === "Súcubo" ? "Sucubo" : razaElegida;
            u.creandoPaso = undefined;
            u.tempNombre = undefined;
            u.tempGenero = undefined;
            u.tempEdad = undefined;
            guardarTodo();

            return message.reply(
                `🎉 *¡PERSONAJE CREADO CON ÉXITO!* 🎉\n\n` +
                `👤 Nombre: *${u.nombre}*\n` +
                `🧝 Raza: *${u.raza}* | Género: ${u.genero} \vert{} Edad:${u.edad}\n\n` +
                `¡Ya puedes usar \`.misiones\`, \`.trabajar\` o \`.gacha\` para ganar Oro!`
            );
        }
    }

    actualizarEnergia(u);
    u.nivel = Math.floor(u.xp / 100) + 1;
    actualizarRango(u);
    guardarTodo();

    let bonusRazaPB = (u.raza && u.raza.toLowerCase() === "orco") ? 10 : 0;
    let poderInventario = u.inventario.reduce((total, item) => total + item.poder, 0);
    let poderMascota = u.mascota ? u.mascota.poder : 0;
    let poderTotal = poderInventario + bonusRazaPB + poderMascota;

    // 1. MENÚ DE COMANDOS DESGLOSADO Y ORDENADO
    if (texto.toLowerCase() === '.menu' || texto.toLowerCase() === '.ayuda') {
        message.reply(
            `🤖 *MENÚ SUPREMO - BOT RPG 2.0* 🎮\n\n` +
            `👤 *PERSONAJE Y SOCIAL*\n` +
            `• \`.razas\`\n` +
            `  └ Ver razas y sus ventajas pasivas.\n` +
            `• \`.rangos\`\n` +
            `  └ Ver niveles requeridos por rango.\n` +
            `• \`.perfil\`\n` +
            `  └ Muestra tu tarjeta, stats y mochila (Envía imagen).\n` +
            `• \`.ranking\` (o \`.top\`)\n` +
            `  └ Muestra el top de jugadores por Poder de Batalla.\n` +
            `• \`.crearpersonaje\`\n` +
            `  └ Asistente guiado paso a paso para crear tu ficha.\n` +
            `• \`.actualizarpersonaje [Nombre] [Gen] [Edad] [Raza]\`\n` +
            `  └ Modifica tu ficha existente.\n` +
            `• \`.casar @usuario\`\n` +
            `  └ Pide matrimonio a otro aventurero.\n` +
            `• \`.aceptar\` | \`.rechazar\`\n` +
            `  └ Acepta o rechaza una propuesta de matrimonio pendiente.\n` +
            `• \`.divorciar\`\n` +
            `  └ Termina tu matrimonio actual.\n` +
            `• \`.intimar @usuario\`\n` +
            `  └ Gana XP/Oro con tu pareja. (Costo: ⚡ 5)\n` +
            `• \`.regalar @usuario [Cantidad]\`\n` +
            `  └ Transfiere Oro 🪙 a otro jugador de tu saldo.\n\n` +
            `🎁 *RECOMPENSAS Y MASCOTAS*\n` +
            `• \`.diario\`\n` +
            `  └ Recompensa diaria con racha de Oro y XP.\n` +
            `• \`.adoptar [slime / lobo / fenix]\`\n` +
            `  └ Compra una mascota permanente (1k / 3.5k / 8k 🪙).\n` +
            `• \`.mascota\`\n` +
            `  └ Revisa el estado y poder de tu compañero.\n\n` +
            `⚔️ *CAZA, TRABAJO Y EXPEDICIONES*\n` +
            `• \`.misiones\`\n` +
            `  └ Muestra tus 3 contratos de caza personales según tu rango.\n` +
            `• \`.completar [ID]\`\n` +
            `  └ Completa una misión de tu tablero. (Costo: ⚡ 10)\n` +
            `• \`.trabajar\`\n` +
            `  └ Gana Oro y XP de forma rápida. (Costo: ⚡ 2 | Enfriamiento: ⏳ 1 min)\n` +
            `• \`.contrabando [Cantidad]\`\n` +
            `  └ Apuesta tu Oro con 45% de éxito. (Costo: ⚡ 5)\n` +
            `• \`.expedicion [Minutos 1-60]\`\n` +
            `  └ Envía a tu aventurero de viaje (Máximo 1 hora). (Costo: ⚡ 20)\n` +
            `• \`.reclamarexpedicion\`\n` +
            `  └ Reclama las recompensas al terminar el tiempo.\n` +
            `• \`.raid\`\n` +
            `  └ Ataca al Jefe Mundial del servidor. (Costo: ⚡ 15)\n` +
            `• \`.duelo @usuario\`\n` +
            `  └ Combate PvP por botín de Oro. (Costo: ⚡ 10 | Enfriamiento: ⏳ 5 min)\n\n` +
            `🧪 *TIENDA, GACHA Y GREMIOS*\n` +
            `• \`.gacha\`\n` +
            `  └ Abre una caja sorpresa de equipo o recursos. (Costo: 50 🪙 | Enfriamiento: ⏳ 1 min)\n` +
            `• \`.mercado\`\n` +
            `  └ Ve los artículos puestos a la venta por otros jugadores.\n` +
            `• \`.vender [Objeto] [Precio]\`\n` +
            `  └ Publica un objeto de tu mochila al mercado.\n` +
            `• \`.comprarpocion\`\n` +
            `  └ Compra una Poción de Energía. (Costo: 500 🪙)\n` +
            `• \`.usarpocion\`\n` +
            `  └ Restaura tu energía al 100% al instante.\n` +
            `• \`.creargremio [Nombre]\`\n` +
            `  └ Funda un nuevo clan. (Costo: 10,000 🪙)\n` +
            `• \`.unirgremio [Nombre]\`\n` +
            `  └ Te unes a un gremio existente.\n` +
            `• \`.depositargremio [Cantidad]\` | \`.retirargremio [Cantidad]\`\n` +
            `  └ Gestiona los fondos del banco general del clan.\n` +
            `• \`.gremio\`\n` +
            `  └ Muestra la información y miembros de tu clan.\n` +
            `• \`.salirdelgremio\`\n` +
            `  └ Abandonas tu gremio actual.`
        );
    }

    // 2. GUÍA DE RAZAS
    else if (texto.toLowerCase() === '.razas') {
        message.reply(
            `🧝 *RAZAS DISPONIBLES Y VENTAJAS* 💜\n\n` +
            `🛡️ *Humano*: +20% de Oro al trabajar/expedición\n` +
            `🏹 *Elfo*: +15% XP extra en misiones/trabajos/expedición\n` +
            `⛏️ *Enano*: Mejor valor base en objetos gacha\n` +
            `🧌 *Orco*: +10 Poder de Batalla permanente\n` +
            `💀 *No-muerto*: Energía recarga 20% más rápido\n` +
            `💜 *Súcubo*: Energía recarga rápida + bonus al intimar`
        );
    }

    // 3. RANGOS Y NIVELES
    else if (texto.toLowerCase() === '.rangos') {
        message.reply(
            `⭐ *RANGOS SOCIALES Y NIVELES* ⭐\n\n` +
            `🌱 *Novato*: Niveles 1 al 20\n` +
            `⭐ *Oficial*: Niveles 21 al 50\n` +
            `👑 *Maestro*: Niveles 51 al 80\n` +
            `⚡ *Leyenda*: Niveles 81 en adelante`
        );
    }

    // 4. RECOMPENSA DIARIA CON RACHAS
    else if (texto.toLowerCase() === '.diario') {
        const hoy = new Date().toDateString();
        const ayer = new Date(Date.now() - 86400000).toDateString();

        if (u.ultimoDiario === hoy) {
            return message.reply('❌ Ya reclamaste tu recompensa diaria hoy. ¡Vuelve mañana!');
        }

        if (u.ultimoDiario === ayer) {
            u.rachaDiaria = (u.rachaDiaria || 0) + 1;
        } else {
            u.rachaDiaria = 1;
        }

        u.ultimoDiario = hoy;

        let oroDiario = 100 * u.rachaDiaria;
        let xpDiario = 50 * u.rachaDiaria;

        u.dinero += oroDiario;
        u.xp += xpDiario;

        let extraMsg = "";
        if (u.rachaDiaria % 3 === 0) {
            u.pocionesEnergia = (u.pocionesEnergia || 0) + 1;
            extraMsg = "\n🎁 *¡Bono por racha de 3 días!:* +1 Poción de Energía";
        }

        const resNivel = checarSubidaNivel(u);
        guardarTodo();

        let respuesta = `🎁 *¡RECOMPENSA DIARIA RECLAMADA!* 🔥\n\n` +
                        `📅 Racha activa: *${u.rachaDiaria} día(s) consecutivos*\n` +
                        `🪙 Recompensa Oro: *+${oroDiario.toLocaleString()} 🪙*\n` +
                        `✨ Recompensa XP: *+${xpDiario} XP*` +
                        extraMsg + `\n\n⭐ Saldo: ${u.dinero.toLocaleString()} 🪙 \vert{} Nivel: ${u.nivel}`;

        if (resNivel.subio) respuesta += `\n\n🎊 *¡SUBISTE AL NIVEL ${u.nivel} (${u.rango})!*`;
        message.reply(respuesta);
    }

    // 5. ADOPTAR MASCOTA
    else if (texto.toLowerCase().startsWith('.adoptar')) {
        if (u.mascota) return message.reply(`❌ Ya tienes una mascota compañera (*${u.mascota.nombre}*).`);
        
        const tipo = texto.replace(/^\.adoptar\s*/i, '').trim().toLowerCase();
        let costo = 0;
        let mascotaData = {};

        if (tipo === 'slime') {
            costo = 1000;
            mascotaData = { nombre: "Slime Amigable", tipo: "Slime", poder: 15 };
        } else if (tipo === 'lobo') {
            costo = 3500;
            mascotaData = { nombre: "Lobo Feroz", tipo: "Lobo", poder: 30 };
        } else if (tipo === 'fenix') {
            costo = 8000;
            mascotaData = { nombre: "Fénix Místico", tipo: "Fenix", poder: 60 };
        } else {
            return message.reply(
                `🐾 *MERCADO DE ADOPCIÓN DE MASCOTAS* 🐾\n\n` +
                `• 🟢 \`slime\` (1,000 🪙 | +15 PB)\n` +
                `• 🐺 \`lobo\` (3,500 🪙 | +30 PB)\n` +
                `• 🔥 \`fenix\` (8,000 🪙 | +60 PB)\n\n` +
                `Ejemplo: \`.adoptar lobo\``
            );
        }

        if (u.dinero < costo) {
            return message.reply(`❌ No te alcanza. Adoptar un *${tipo}* cuesta${costo.toLocaleString()} 🪙 y tienes ${u.dinero.toLocaleString()} 🪙.`);
        }

        u.dinero -= costo;
        u.mascota = mascotaData;
        guardarTodo();

        message.reply(`🐾 ¡Felicidades! Has adoptado a tu nueva mascota: *${mascotaData.nombre}* (+${mascotaData.poder} PB).`);
    }

    // 6. VER MASCOTA
    else if (texto.toLowerCase() === '.mascota') {
        if (!u.mascota) return message.reply('❌ No tienes mascota. Adopta una con `.adoptar [slime/lobo/fenix]`.');
        message.reply(`🐾 *ESTADO DE TU MASCOTA*\n\n🏷️ Nombre: *${u.mascota.nombre}*\n⚔️ Poder aportado: *+${u.mascota.poder} PB*`);
    }

    // 7. EXPEDICIÓN (IDLE) - Máximo 1 hora (60 minutos)
    else if (texto.toLowerCase().startsWith('.expedicion')) {
        if (u.expedicion && u.expedicion.activa) {
            return message.reply('❌ Tu aventurero ya está en expedición. Reclama con `.reclamarexpedicion`.');
        }

        const minutos = parseInt(texto.replace(/^\.expedicion\s*/i, '').trim());
        if (isNaN(minutos) || minutos < 1 || minutos > 60) {
            return message.reply('❌ Especifica la duración en minutos (de 1 a 60).\nEjemplo: `.expedicion 30`');
        }

        if (u.energia < 20) return message.reply('⚡ Necesitas al menos 20 de energía para expediciones.');

        u.energia -= 20;
        const tiempoFin = Date.now() + (minutos * 60 * 1000);
        u.expedicion = { activa: true, fin: tiempoFin, minutos: minutos };
        guardarTodo();

        message.reply(`🗺️ *¡EXPEDICIÓN INICIADA!*\nTu aventurero estará explorando durante *${minutos} minuto(s)*.\n⚡ Energía gastada: -20\n\nReclama con \`.reclamarexpedicion\`.`);
    }

    // 8. RECLAMAR EXPEDICIÓN
    else if (texto.toLowerCase() === '.reclamarexpedicion') {
        if (!u.expedicion || !u.expedicion.activa) {
            return message.reply('❌ No tienes ninguna expedición activa.');
        }

        const ahora = Date.now();
        if (ahora < u.expedicion.fin) {
            const segundosRestantes = Math.ceil((u.expedicion.fin - ahora) / 1000);
            const mins = Math.floor(segundosRestantes / 60);
            const segs = segundosRestantes % 60;
            return message.reply(`⏳ Expedición en curso. Faltan *${mins}m${segs}s* para que regrese.`);
        }

        const minutos = u.expedicion.minutos;
        let oroGanado = minutos * 15;
        let xpGanado = minutos * 10;

        if (u.raza && u.raza.toLowerCase() === "elfo") xpGanado = Math.floor(xpGanado * 1.15);
        if (u.raza && u.raza.toLowerCase() === "humano") oroGanado = Math.floor(oroGanado * 1.2);

        u.dinero += oroGanado;
        u.xp += xpGanado;
        u.expedicion = null;

        const resNivel = checarSubidaNivel(u);
        guardarTodo();

        let respuesta = `🗺️🎁 *¡EXPEDICIÓN EXITOSA!*\n🪙 Oro ganado: *+${oroGanado.toLocaleString()} 🪙*\n✨ XP ganada: *+${xpGanado} XP*`;
        if (resNivel.subio) respuesta += `\n\n🎊 *¡SUBISTE AL NIVEL ${u.nivel} (${u.rango})!*`;
        message.reply(respuesta);
    }

    // 9. CASARSE (ENVÍA PROPUESTA)
    else if (texto.toLowerCase().startsWith('.casar')) {
        const mentions = message.mentionedIds;
        if (!mentions || mentions.length === 0) return message.reply('❌ Etiqueta a la persona. Ejemplo: `.casar @usuario`');

        const targetUser = mentions[0];
        if (targetUser === numeroUser) return message.reply('❌ No te puedes casar contigo mismo.');
        if (!usuarios[targetUser] || usuarios[targetUser].nombre === "Aventurero Sin Nombre") return message.reply('❌ Esa persona no tiene personaje.');
        if (u.pareja) return message.reply('❌ Ya estás casado/a.');
        if (usuarios[targetUser].pareja) return message.reply('❌ Esa persona ya tiene pareja.');
        if (usuarios[targetUser].propuestaDe) return message.reply('❌ Esa persona ya tiene una propuesta de matrimonio pendiente.');

        usuarios[targetUser].propuestaDe = numeroUser;
        guardarTodo();

        message.reply(`💍 *¡PROPUESTA DE MATRIMONIO ENVIADA!* 💌\n\n*${u.nombre}* le ha pedido matrimonio a *${usuarios[targetUser].nombre}*.\n\n💡 La otra persona debe responder con \`.aceptar\` o \`.rechazar\`.`);
    }

    // 9.1 ACEPTAR PROPUESTA DE MATRIMONIO
    else if (texto.toLowerCase() === '.aceptar') {
        if (!u.propuestaDe) return message.reply('❌ No tienes ninguna propuesta de matrimonio pendiente.');
        const requesterId = u.propuestaDe;
        const requester = usuarios[requesterId];

        if (!requester) {
            u.propuestaDe = null;
            guardarTodo();
            return message.reply('❌ El usuario que te propuso matrimonio ya no existe o borró su personaje.');
        }

        if (u.pareja || requester.pareja) {
            u.propuestaDe = null;
            guardarTodo();
            return message.reply('❌ Uno de los dos ya se encuentra casado actualmente.');
        }

        u.pareja = requesterId;
        requester.pareja = numeroUser;
        u.propuestaDe = null;
        guardarTodo();

        message.reply(`💍✨ *¡BODAS EN EL REINO!* ✨💍\n\n*${requester.nombre}* y *${u.nombre}* han aceptado unir sus destinos.\n¡Son oficialmente pareja! ❤️🎉`);
    }

    // 9.2 RECHAZAR PROPUESTA DE MATRIMONIO
    else if (texto.toLowerCase() === '.rechazar') {
        if (!u.propuestaDe) return message.reply('❌ No tienes ninguna propuesta de matrimonio pendiente.');
        const requesterId = u.propuestaDe;
        const requester = usuarios[requesterId];
        u.propuestaDe = null;
        guardarTodo();

        message.reply(`💔 *${u.nombre}* ha rechazado la propuesta de matrimonio${requester ? ' de *' + requester.nombre + '*' : ''}. ¡Qué desamor! 🥀`);
    }

    // 10. DIVORCIARSE
    else if (texto.toLowerCase() === '.divorciar') {
        if (!u.pareja) return message.reply('❌ No estás casado con nadie.');
        const exParejaId = u.pareja;
        u.pareja = null;
        if (usuarios[exParejaId]) usuarios[exParejaId].pareja = null;
        guardarTodo();
        message.reply(`💔 Se firmó el divorcio.`);
    }

    // 11. INTIMAR (CON FRASES DINÁMICAS ALEATORIAS)
    else if (texto.toLowerCase().startsWith('.intimar')) {
        if (!u.pareja) return message.reply('❌ No estás casado/a.');
        const mentions = message.mentionedIds;
        if (!mentions || mentions.length === 0) return message.reply('❌ Etiqueta a tu pareja. Ejemplo: `.intimar @usuario`');

        const targetUser = mentions[0];
        if (targetUser !== u.pareja) return message.reply('❌ Solo puedes intimar con tu esposo/a oficial.');

        let parejaObj = usuarios[targetUser];
        if (u.energia < 5) return message.reply(`⚡ Estás cansado/a.`);

        u.energia -= 5;
        let bonusXp = 40;
        let bonusOro = 60;
        if ((u.raza && u.raza.toLowerCase().includes("súcubo")) || (parejaObj.raza && parejaObj.raza.toLowerCase().includes("súcubo"))) {
            bonusXp = 75;
            bonusOro = 110;
        }

        u.xp += bonusXp;
        u.dinero += bonusOro;
        parejaObj.xp += bonusXp;
        parejaObj.dinero += bonusOro;

        checarSubidaNivel(u);
        checarSubidaNivel(parejaObj);
        guardarTodo();

        const frasesIntimo = [
            `Se fueron a una cabaña apartada a pasar el rato bajo la luz de las estrellas. ✨❤️`,
            `Compartieron una cena romántica a la luz de las velas que terminó en una noche inolvidable. 🍷🔥`,
            `Se perdieron en sus miradas y decidieron pasar un buen rato a solas lejos del bullicio del reino. 🌹`,
            `Desataron su pasión con total complicidad en los aposentos privados. 💖🔥`,
            `Se escaparon un momento de las misiones para consentirse mutuamente y recargar energías de otra forma. 😘`
        ];
        const fraseElegida = frasesIntimo[Math.floor(Math.random() * frasesIntimo.length)];

        message.reply(`💋 *¡MOMENTO ÍNTIMO!* 💖\n\n_${fraseElegida}_\n\n✨ Ambos ganaron: *+${bonusXp} XP* y *+${bonusOro} 🪙*`);
    }

    // 12. REGALAR ORO A OTRO USUARIO
    else if (texto.toLowerCase().startsWith('.regalar')) {
        const mentions = message.mentionedIds;
        if (!mentions || mentions.length === 0) {
            return message.reply('❌ Etiqueta al usuario al que le quieres regalar Oro.\nEjemplo: `.regalar @usuario 500`');
        }

        const targetUser = mentions[0];
        if (targetUser === numeroUser) return message.reply('❌ No te puedes regalar Oro a ti mismo.');
        if (!usuarios[targetUser] || usuarios[targetUser].nombre === "Aventurero Sin Nombre") {
            return message.reply('❌ Esa persona no tiene un personaje registrado.');
        }

        const partes = texto.split(/\s+/);
        let cantidad = NaN;
        for (let i = partes.length - 1; i >= 1; i--) {
            let num = parseInt(partes[i]);
            if (!isNaN(num)) {
                cantidad = num;
                break;
            }
        }

        if (isNaN(cantidad) || cantidad <= 0) {
            return message.reply('❌ Especifica una cantidad válida de Oro.\nEjemplo: `.regalar @usuario 500`');
        }

        if (u.dinero < cantidad) {
            return message.reply(`❌ No tienes suficiente Oro. Tu saldo personal es *${u.dinero.toLocaleString()} 🪙*.`);
        }

        u.dinero -= cantidad;
        usuarios[targetUser].dinero += cantidad;
        guardarTodo();

        message.reply(
            `🎁💸 *¡TRANSFERENCIA EXITOSA!*\n\n` +
            `Has regalado *${cantidad.toLocaleString()} 🪙* a *${usuarios[targetUser].nombre}*.\n\n` +
            `💼 Tu nuevo saldo: ${u.dinero.toLocaleString()} 🪙`
        );
    }

    // 13. RANKING
    else if (texto.toLowerCase() === '.ranking' || texto.toLowerCase() === '.top') {
        let listaUsuarios = Object.values(usuarios)
            .filter(usr => usr.nombre !== "Aventurero Sin Nombre")
            .map(usr => {
                let bonusP = (usr.raza && usr.raza.toLowerCase() === "orco") ? 10 : 0;
                let pbM = usr.mascota ? usr.mascota.poder : 0;
                let pb = usr.inventario.reduce((t, i) => t + i.poder, 0) + bonusP + pbM;
                return { nombre: usr.nombre, raza: usr.raza, rango: usr.rango, nivel: usr.nivel || 1, pb: pb };
            });

        if (listaUsuarios.length === 0) return message.reply('🏆 No hay aventureros en el ranking.');
        listaUsuarios.sort((a, b) => b.pb - a.pb);

        let respuesta = '🏆 *TABLA DE CLASIFICACIÓN (TOP JUGADORES)* 🏆\n\n';
        listaUsuarios.slice(0, 10).forEach((usr, index) => {
            let medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
            respuesta += `${medalla} *#${index + 1}${usr.nombre}* (${usr.raza})\n   ⭐ Nivel ${usr.nivel} (${usr.rango}) \vert{} ⚔️ Poder: *${usr.pb} PB*\n\n`;
        });
        message.reply(respuesta);
    }

    // 14. CREAR PERSONAJE
    else if (texto.toLowerCase().startsWith('.crearpersonaje')) {
        if (u.nombre !== "Aventurero Sin Nombre") return message.reply('❌ ¡Ya tienes un personaje registrado!');
        
        const contenido = texto.replace(/^\.crearpersonaje\s*/i, '').trim();
        if (!contenido) {
            u.creandoPaso = 1;
            guardarTodo();
            return message.reply(
                `📜 *ASISTENTE DE CREACIÓN DE PERSONAJE* 🧙‍♂️\n\n` +
                `¡Hola! Vamos a configurar tu ficha paso a paso.\n\n` +
                `Paso 1/4: Escribe el *Nombre* que tendrá tu aventurero:`
            );
        }

        const partes = contenido.split(/\s+/);
        if (partes.length >= 4) {
            u.raza = partes.pop();
            u.edad = partes.pop();
            u.genero = partes.pop();
            u.nombre = partes.join(' ');
            guardarTodo();
            message.reply(`🎉 ¡PERSONAJE CREADO!\n👤 Nombre: *${u.nombre}*\n🧝 Raza: *${u.raza}*`);
        } else {
            message.reply('❌ Formato incorrecto. Escribe `.crearpersonaje` para iniciar el asistente guiado.');
        }
    }

    // 15. ACTUALIZAR PERSONAJE
    else if (texto.toLowerCase().startsWith('.actualizarpersonaje')) {
        if (u.nombre === "Aventurero Sin Nombre") return message.reply('❌ No tienes personaje creado.');
        const contenido = texto.replace(/^\.actualizarpersonaje\s*/i, '').trim();
        const partes = contenido.split(/\s+/);

        if (partes.length >= 4) {
            u.raza = partes.pop();
            u.edad = partes.pop();
            u.genero = partes.pop();
            u.nombre = partes.join(' ');
            guardarTodo();
            message.reply(`🔄 ¡FICHA ACTUALIZADA!\n👤 Nombre: *${u.nombre}* \vert{} 🧝 Raza: *${u.raza}*`);
        } else {
            message.reply('❌ Formato: `.actualizarpersonaje Nombre Género Edad Raza`');
        }
    }

    // 16. VER MISIONES (TABLERO PERSONAL POR RANGO)
    else if (texto.toLowerCase() === '.misiones') {
        if (!u.misMisiones || u.misMisiones.length === 0) {
            u.misMisiones = [
                generarMisionPorRango(u.rango, 1),
                generarMisionPorRango(u.rango, 2),
                generarMisionPorRango(u.rango, 3)
            ];
            guardarTodo();
        }

        let respuesta = `📋 *TABLERO DE CONTRATOS DE CAZA (${u.rango.toUpperCase()})* 📋\n\n`;
        u.misMisiones.forEach(m => {
            respuesta += `🔹 *ID ${m.id}*: ${m.desc}\n   🎯 Rango: *[${m.rangoReq}]* | ✨ ${m.xp} XP \vert{} 🪙 ${m.dinero.toLocaleString()}\n\n`;
        });
        respuesta += '💡 Completa con: `.completar [ID]`';
        message.reply(respuesta);
    }

    // 17. TRABAJAR
    else if (texto.toLowerCase() === '.trabajar') {
        const costoEnergia = 2;
        const ahora = Date.now();
        if (u.ultimoTrabajo && (ahora - u.ultimoTrabajo < 60000)) {
            const seg = Math.ceil((60000 - (ahora - u.ultimoTrabajo)) / 1000);
            return message.reply(`⏳ Descansa ${seg} segundos más.`);
        }
        if (u.energia < costoEnergia) return message.reply(`⚡ Estás cansado (*${Math.floor(u.energia)}/100*).`);

        u.energia -= costoEnergia;
        u.ultimoTrabajo = ahora;

        let baseOro = Math.floor(Math.random() * 40) + 20;
        let baseXp = Math.floor(Math.random() * 20) + 10;
        if (u.raza && u.raza.toLowerCase() === "humano") baseOro = Math.floor(baseOro * 1.2);
        if (u.raza && u.raza.toLowerCase() === "elfo") baseXp = Math.floor(baseXp * 1.15);

        u.dinero += baseOro;
        u.xp += baseXp;
        const resNivel = checarSubidaNivel(u);
        guardarTodo();

        let respuesta = `🛠️ *¡TRABAJO EXITOSO!*\n🪙 +${baseOro} 🪙\n✨ +${baseXp} XP\n⚡ Energía: *${Math.floor(u.energia)}/100*`;
        if (resNivel.subio) respuesta += `\n\n🎊 *¡SUBISTE AL NIVEL ${u.nivel} (${u.rango})!*`;
        message.reply(respuesta);
    }

    // 18. CONTRABANDO (Sin enfriamiento de tiempo)
    else if (texto.toLowerCase().startsWith('.contrabando')) {
        const partes = texto.split(/\s+/);
        const apuesta = parseInt(partes[1]);

        if (isNaN(apuesta) || apuesta <= 50) return message.reply('❌ Arriesga al menos 50 🪙.\nEjemplo: `.contrabando 100`');
        if (u.dinero < apuesta) return message.reply(`❌ Saldo insuficiente (${u.dinero.toLocaleString()} 🪙).`);
        if (u.energia < 5) return message.reply('⚡ Necesitas 5 de energía.');

        u.energia -= 5;
        const exito = Math.random() < 0.45;

        if (exito) {
            u.dinero += apuesta;
            guardarTodo();
            message.reply(`📦✨ *¡CONTRABANDO EXITOSO!*\n🪙 Ganaste: *+${apuesta.toLocaleString()} 🪙* (Total: ${u.dinero.toLocaleString()} 🪙)`);
        } else {
            u.dinero -= apuesta;
            guardarTodo();
            message.reply(`🚨🚔 *¡TE ATRAPARON!*\n💸 Perdiste: *-${apuesta.toLocaleString()} 🪙* (Total: ${u.dinero.toLocaleString()} 🪙)`);
        }
    }

    // 19. DUELO PVP (Con enfriamiento de 5 minutos)
    else if (texto.toLowerCase().startsWith('.duelo')) {
        const ahora = Date.now();
        const tiempoEspera = 5 * 60 * 1000; // 5 minutos en milisegundos

        if (u.ultimoDuelo && (ahora - u.ultimoDuelo < tiempoEspera)) {
            const segundosRestantes = Math.ceil((tiempoEspera - (ahora - u.ultimoDuelo)) / 1000);
            const mins = Math.floor(segundosRestantes / 60);
            const segs = segundosRestantes % 60;
            return message.reply(`⏳ Tus músculos aún están cansados. Debes esperar *${mins}m${segs}s* antes de volver a retar a un duelo.`);
        }

        const mentions = message.mentionedIds;
        if (!mentions || mentions.length === 0) return message.reply('❌ Etiqueta a tu oponente. Ejemplo: `.duelo @usuario`');

        const rivalId = mentions[0];
        if (rivalId === numeroUser) return message.reply('❌ No puedes batallarte a ti mismo.');
        if (!usuarios[rivalId] || usuarios[rivalId].nombre === "Aventurero Sin Nombre") return message.reply('❌ Tu rival no tiene personaje.');

        let rival = usuarios[rivalId];
        if (u.energia < 10) return message.reply('⚡ Necesitas 10 de energía para el duelo.');

        u.energia -= 10;
        u.ultimoDuelo = ahora;

        let bonusRivalPB = (rival.raza && rival.raza.toLowerCase() === "orco") ? 10 : 0;
        let pbRivalMascota = rival.mascota ? rival.mascota.poder : 0;
        let pbRival = rival.inventario.reduce((t, i) => t + i.poder, 0) + bonusRivalPB + pbRivalMascota;

        let poderUsuarioFinal = poderTotal + Math.floor(Math.random() * 25);
        let poderRivalFinal = pbRival + Math.floor(Math.random() * 25);

        if (poderUsuarioFinal >= poderRivalFinal) {
            let botin = Math.min(200, rival.dinero);
            rival.dinero -= botin;
            u.dinero += botin;
            u.xp += 50;
            checarSubidaNivel(u);
            guardarTodo();

            message.reply(`⚔️🏆 *¡VICTORIA EN EL DUELO!* 🏆⚔️\n\n*${u.nombre}* derrotó a *${rival.nombre}*.\n🪙 Botín: *+${botin.toLocaleString()} 🪙* | ✨ XP: *+50*`);
        } else {
            let botin = Math.min(200, u.dinero);
            u.dinero -= botin;
            rival.dinero += botin;
            rival.xp += 50;
            checarSubidaNivel(rival);
            guardarTodo();

            message.reply(`⚔️💀 *¡DERROTA EN EL DUELO!* 💀⚔️\n\n*${rival.nombre}* destrozó a *${u.nombre}*.\n💸 Perdiste: *-${botin.toLocaleString()} 🪙*`);
        }
    }

    // 20. RAID DE JEFE MUNDIAL
    else if (texto.toLowerCase() === '.raid') {
        if (!raidBoss.activo || raidBoss.hpActual <= 0) {
            return message.reply(`🐉 El jefe anterior fue derrotado. Otro titán se aproxima...`);
        }
        if (u.energia < 15) return message.reply('⚡ Necesitas 15 de energía para el Raid.');

        u.energia -= 15;
        let dañoHecho = poderTotal + Math.floor(Math.random() * 40) + 20;
        raidBoss.hpActual = Math.max(0, raidBoss.hpActual - dañoHecho);

        let respuesta = `🐉🔥 *¡ATAQUE AL JEFE MUNDIAL!* 🔥🐉\n\n` +
                        `🎯 Jefe: *${raidBoss.nombre}*\n` +
                        `💥 Daño: *${dañoHecho}*\n` +
                        `❤️ HP: *${raidBoss.hpActual} /${raidBoss.hpMax}*\n\n`;

        if (raidBoss.hpActual <= 0) {
            raidBoss.activo = false;
            let recompensaOro = 1500;
            let recompensaXp = 500;

            u.dinero += recompensaOro;
            u.xp += recompensaXp;
            checarSubidaNivel(u);

            setTimeout(() => {
                raidBoss.nombre = "Señor de la Oscuridad Abisal";
                raidBoss.hpMax = 7500;
                raidBoss.hpActual = 7500;
                raidBoss.activo = true;
            }, 60000);

            respuesta += `🎉 *¡JEFE DERROTADO POR EL SERVIDOR!* 🎉\n👑 *${u.nombre}* dio el golpe final: *+${recompensaOro.toLocaleString()} 🪙* y *+${recompensaXp} XP*!`;
        }

        guardarTodo();
        message.reply(respuesta);
    }

    // 21. COMPRAR POCIÓN
    else if (texto.toLowerCase() === '.comprarpocion') {
        const costo = 500;
        if (u.dinero < costo) return message.reply(`❌ Una Poción de Energía cuesta *${costo} 🪙* y tienes *${u.dinero.toLocaleString()} 🪙*.`);

        u.dinero -= costo;
        u.pocionesEnergia = (u.pocionesEnergia || 0) + 1;
        guardarTodo();

        message.reply(`🧪 ¡Compraste una Poción de Energía por ${costo} 🪙! Tienes *${u.pocionesEnergia}*. Úsala con \`.usarpocion\`.`);
    }

    // 22. USAR POCIÓN
    else if (texto.toLowerCase() === '.usarpocion') {
        if (!u.pocionesEnergia || u.pocionesEnergia <= 0) return message.reply('❌ No tienes pociones.');
        if (u.energia >= 100) return message.reply('⚡ Energía ya al máximo.');

        u.pocionesEnergia -= 1;
        u.energia = 100;
        guardarTodo();

        message.reply(`🧪✨ Energía restaurada al *100/100*! Te quedan *${u.pocionesEnergia}* pociones.`);
    }

    // 23. SISTEMA DE GREMIOS Y BANCO GENERAL DE CLAN
    else if (texto.toLowerCase().startsWith('.creargremio')) {
        const nombreGremio = texto.replace(/^\.creargremio\s*/i, '').trim();
        if (!nombreGremio) return message.reply('❌ Escribe el nombre del gremio.\nEjemplo: `.creargremio CaballerosDeHonor`');
        if (u.gremio) return message.reply('❌ Ya estás registrado en un gremio.');
        
        const costoCreacion = 10000;
        if (u.dinero < costoCreacion) return message.reply(`❌ Fundar un gremio cuesta *${costoCreacion.toLocaleString()} 🪙* y tienes *${u.dinero.toLocaleString()} 🪙*.`);
        if (gremios[nombreGremio]) return message.reply('❌ Ya existe un gremio con ese nombre.');

        u.dinero -= costoCreacion;
        u.gremio = nombreGremio;
        gremios[nombreGremio] = { 
            lider: u.nombre, 
            banco: 0, 
            miembros: [u.nombre] 
        };
        guardarTodo();

        message.reply(`🏰 ¡Felicidades! Gremio *${nombreGremio}* fundado con éxito por *${costoCreacion.toLocaleString()} 🪙*.\nAhora eres el Líder supremo.`);
    }

    else if (texto.toLowerCase().startsWith('.unirgremio')) {
        const nombreGremio = texto.replace(/^\.unirgremio\s*/i, '').trim();
        if (!gremios[nombreGremio]) return message.reply('❌ Ese gremio no existe.');
        if (u.gremio) return message.reply('❌ Ya estás en un gremio. Sal primero con `.salirdelgremio`.');

        u.gremio = nombreGremio;
        gremios[nombreGremio].miembros.push(u.nombre);
        guardarTodo();

        message.reply(`🤝 ¡Te has unido con éxito al gremio *${nombreGremio}*!`);
    }

    else if (texto.toLowerCase().startsWith('.depositargremio')) {
        if (!u.gremio || !gremios[u.gremio]) return message.reply('❌ No perteneces a ningún gremio.');
        
        const partes = texto.split(/\s+/);
        const cantidad = parseInt(partes[1]);
        if (isNaN(cantidad) || cantidad <= 0) return message.reply('❌ Especifica una cantidad válida a depositar.\nEjemplo: `.depositargremio 500`');

        if (u.dinero < cantidad) return message.reply(`❌ No tienes tanto Oro. Tu saldo personal es *${u.dinero.toLocaleString()} 🪙*.`);

        u.dinero -= cantidad;
        gremios[u.gremio].banco += cantidad;
        guardarTodo();

        message.reply(`💰🏦 *¡DEPÓSITO AL BANCO DEL GREMIO!*\nHas depositado *${cantidad.toLocaleString()} 🪙* al banco de *${u.gremio}*.\n\n💼 Saldo personal: ${u.dinero.toLocaleString()} 🪙\n🏰 Banco del Gremio: *${gremios[u.gremio].banco.toLocaleString()} 🪙*`);
    }

    else if (texto.toLowerCase().startsWith('.retirargremio')) {
        if (!u.gremio || !gremios[u.gremio]) return message.reply('❌ No perteneces a ningún gremio.');
        
        let g = gremios[u.gremio];
        if (g.lider !== u.nombre) {
            return message.reply('❌ Solo el Líder del gremio puede retirar fondos del banco general.');
        }

        const partes = texto.split(/\s+/);
        const cantidad = parseInt(partes[1]);
        if (isNaN(cantidad) || cantidad <= 0) return message.reply('❌ Especifica una cantidad válida a retirar.\nEjemplo: `.retirargremio 500`');

        if (g.banco < cantidad) return message.reply(`❌ El banco del gremio no tiene esa cantidad. Fondos actuales: *${g.banco.toLocaleString()} 🪙*.`);

        g.banco -= cantidad;
        u.dinero += cantidad;
        guardarTodo();

        message.reply(`💸🏦 *¡RETIRO DEL BANCO DEL GREMIO!*\nHas retirado *${cantidad.toLocaleString()} 🪙* para tu billetera personal.\n\n💼 Tu saldo personal: ${u.dinero.toLocaleString()} 🪙\n🏰 Banco del Gremio: *${g.banco.toLocaleString()} 🪙*`);
    }

    else if (texto.toLowerCase() === '.salirdelgremio') {
        if (!u.gremio || !gremios[u.gremio]) return message.reply('❌ No estás en ningún gremio.');

        const nombreGremio = u.gremio;
        let g = gremios[nombreGremio];

        g.miembros = g.miembros.filter(m => m !== u.nombre);
        u.gremio = null;

        if (g.miembros.length === 0) {
            delete gremios[nombreGremio];
            guardarTodo();
            return message.reply(`🚪 Has abandonado el gremio *${nombreGremio}*. Como ya no quedaban miembros, el gremio ha sido disuelto.`);
        }

        if (g.lider === u.nombre) {
            g.lider = g.miembros[0];
            guardarTodo();
            return message.reply(`🚪 Has abandonado el gremio *${nombreGremio}*.\n👑 Como eras el líder, el liderazgo ha sido transferido automáticamente a *${g.lider}*.`);
        }

        guardarTodo();
        message.reply(`🚪 Has abandonado exitosamente el gremio *${nombreGremio}*.`);
    }

    else if (texto.toLowerCase() === '.gremio') {
        if (!u.gremio || !gremios[u.gremio]) return message.reply('❌ No estás en ningún gremio. Únete con `.unirgremio [Nombre]` o funda uno con `.creargremio [Nombre]`.');
        let g = gremios[u.gremio];
        
        message.reply(
            `🏰 *INFORMACIÓN DEL GREMIO: ${u.gremio}* 🏰\n\n` +
            `👑 Líder supremo: *${g.lider}*\n` +
            `💰 Banco General: *${g.banco.toLocaleString()} 🪙*\n` +
            `👥 Miembros (${g.miembros.length}):${g.miembros.join(', ')}\n\n` +
            `💡 Comandos: \`.depositargremio [cant]\` | \`.retirargremio [cant]\` | \`.salirdelgremio\``
        );
    }

    // 24. PERFIL (CON IMAGEN DE TARJETA)
    else if (texto.toLowerCase() === '.perfil') {
        let nombrePareja = "Soltero/a 💔";
        if (u.pareja && usuarios[u.pareja]) nombrePareja = `Casado/a con *${usuarios[u.pareja].nombre}* ❤️`;

        let nombreMascota = "Ninguna 🐾";
        if (u.mascota) nombreMascota = `*${u.mascota.nombre}* (+${u.mascota.poder} PB)`;

        let listaItems = "Vacío";
        if (u.inventario.length > 0) {
            listaItems = "";
            u.inventario.forEach((item) => {
                listaItems += `\n   ▫️ *[${item.rangoArma}]* ${item.nombre} (PB: +${item.poder})`;
            });
        }

        const textoPerfil = `📜 *FICHA DE PERSONAJE*\n\n` +
                            `👤 Nombre: *${u.nombre}*\n` +
                            `🧝 Raza: *${u.raza}* | 🐾 Mascota: ${nombreMascota}\n` +
                            `🏰 Gremio: ${u.gremio || 'Ninguno'} | 💍 Estado: ${nombrePareja}\n` +
                            `⭐ Nivel: *${u.nivel || 1}* (${u.rango})\n` +
                            `⚡ Energía: *${Math.floor(u.energia)}/100* | 🧪 Pociones: ${u.pocionesEnergia || 0}\n` +
                            `📅 Racha Diario: *${u.rachaDiaria || 0} día(s)*\n` +
                            `⚔️ Poder Total: *${poderTotal} PB* ${bonusRazaPB > 0 ? '(+10 Orco)' : ''}\n` +
                            `✨ XP: ${u.xp} | 🪙 Oro: ${u.dinero.toLocaleString()} 🪙\n\n` +
                            `🎒 *Mochila:*` + listaItems;

        try {
            const mediaPerfil = await MessageMedia.fromUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600');
            await message.reply(mediaPerfil, null, { caption: textoPerfil });
        } catch (e) {
            await message.reply(textoPerfil);
        }
    }

    // 25. VENDER
    else if (texto.toLowerCase().startsWith('.vender')) {
        const contenido = texto.replace(/^\.vender\s*/i, '').trim();
        const partes = contenido.split(/\s+/);

        if (partes.length >= 2) {
            const precioVenta = parseInt(partes.pop());
            const nombreObjeto = partes.join(' ');
            if (isNaN(precioVenta) || precioVenta <= 0) return message.reply('❌ Precio inválido.');

            const indexInv = u.inventario.findIndex(i => i.nombre.toLowerCase() === nombreObjeto.toLowerCase());
            if (indexInv !== -1) {
                const itemObtenido = u.inventario[indexInv];
                u.inventario.splice(indexInv, 1);

                mercado.push({
                    id: mercado.length + 1,
                    vendedor: numeroUser,
                    nombre: itemObtenido.nombre,
                    rangoArma: itemObtenido.rangoArma,
                    poder: itemObtenido.poder,
                    valorBase: itemObtenido.valor,
                    precio: precioVenta
                });
                guardarTodo();
                message.reply(`🏪 ¡Publicado en el Mercado!\n📦 *[${itemObtenido.rangoArma}] ${itemObtenido.nombre}* a *${precioVenta.toLocaleString()} 🪙*`);
            } else {
                message.reply(`❌ No tienes ese objeto.`);
            }
        } else {
            message.reply('❌ Formato: `.vender Espada 80`');
        }
    }

    // 26. MERCADO
    else if (texto.toLowerCase() === '.mercado') {
        if (mercado.length === 0) return message.reply('🛒 Mercado vacío.');
        let respuesta = '🏪 *MERCADO DE LA COMUNIDAD*\n\n';
        mercado.forEach(m => {
            respuesta += `📦 *[ID ${m.id}]* *[${m.rangoArma}]* ${m.nombre} (PB: +${m.poder}) - 🏷️ *${m.precio.toLocaleString()} 🪙*\n\n`;
        });
        respuesta += '💡 Compra con: `.comprarmercado [ID]`';
        message.reply(respuesta);
    }

    // 27. COMPRAR MERCADO
    else if (texto.toLowerCase().startsWith('.comprarmercado')) {
        const idMercado = parseInt(texto.replace('.comprarmercado', '').trim());
        const itemIndex = mercado.findIndex(m => m.id === idMercado);

        if (itemIndex !== -1) {
            const item = mercado[itemIndex];
            if (u.dinero >= item.precio) {
                u.dinero -= item.precio;
                if (usuarios[item.vendedor]) usuarios[item.vendedor].dinero += item.precio;

                u.inventario.push({ nombre: item.nombre, rangoArma: item.rangoArma, poder: item.poder, valor: item.valorBase });
                mercado.splice(itemIndex, 1);
                guardarTodo();
                message.reply(`🎉 ¡Compra exitosa de *[${item.rangoArma}] ${item.nombre}*!`);
            } else {
                message.reply(`❌ No te alcanza (${u.dinero.toLocaleString()} 🪙).`);
            }
        } else {
            message.reply('❌ Artículo no disponible.');
        }
    }

    // 28. GACHA (CON COOLDOWN DE 1 MINUTO E IMAGEN)
    else if (texto.toLowerCase() === '.gacha') {
        const ahora = Date.now();
        if (u.ultimoGacha && (ahora - u.ultimoGacha < 60000)) {
            const segundosRestantes = Math.ceil((60000 - (ahora - u.ultimoGacha)) / 1000);
            return message.reply(`⏳ Debes esperar *${segundosRestantes} segundo(s)* más para abrir otra caja gacha.`);
        }

        const costoGacha = 50;
        if (u.dinero < costoGacha) return message.reply(`❌ Cuesta 50 🪙 y tienes ${u.dinero.toLocaleString()} 🪙.`);

        u.dinero -= costoGacha;
        u.ultimoGacha = ahora;

        const premiosRPG = [
            { tipo: "item", nombre: "Daga Rota", rangoArma: "Común", poder: 8, valor: 15 },
            { tipo: "item", nombre: "Capa Vieja de Viajero", rangoArma: "Común", poder: 5, valor: 12 },
            { tipo: "item", nombre: "Escudo de Madera", rangoArma: "Común", poder: 10, valor: 18 },
            { tipo: "item", nombre: "Espada Corta de Hierro", rangoArma: "Raro", poder: 18, valor: 45 },
            { tipo: "item", nombre: "Arco Recurvo del Bosque", rangoArma: "Raro", poder: 26, valor: 60 },
            { tipo: "item", nombre: "Hacha de Batalla Pesada", rangoArma: "Épico", poder: 48, valor: 140 },
            { tipo: "item", nombre: "Escudo Torre de Acero", rangoArma: "Épico", poder: 60, valor: 175 },
            { tipo: "item", nombre: "🌟 Espada del Dragón Ancestral", rangoArma: "Legendario", poder: 85, valor: 350 },
            { tipo: "item", nombre: "🏹 Arco Élfico Celestial", rangoArma: "Legendario", poder: 90, valor: 380 },
            { tipo: "xp", nombre: "Pergamino de Sabiduría (+150 XP)", valorXP: 150 },
            { tipo: "dinero", nombre: "Cofre con Oro (250 🪙)", valorDinero: 250 },
            { tipo: "nada", nombre: "Frasco vacío... ¡Suerte la próxima!" }
        ];

        const resultado = premiosRPG[Math.floor(Math.random() * premiosRPG.length)];
        let mensajeGacha = `🎰 *¡CAJA GACHA!* (-50 🪙)\n\n🎁 Encontraste: *${resultado.nombre}*!\n\n`;

        if (resultado.tipo === "item") {
            u.inventario.push({ nombre: resultado.nombre, rangoArma: resultado.rangoArma, poder: resultado.poder, valor: resultado.valor });
            mensajeGacha += `🏷️ Rango: *${resultado.rangoArma}* | ⚔️ PB: +${resultado.poder}`;
        } else if (resultado.tipo === "xp") {
            let xpG = resultado.valorXP;
            if (u.raza && u.raza.toLowerCase() === "elfo") xpG = Math.floor(xpG * 1.15);
            u.xp += xpG;
            checarSubidaNivel(u);
            mensajeGacha += `✨ +${xpG} XP!`;
        } else if (resultado.tipo === "dinero") {
            u.dinero += resultado.valorDinero;
            mensajeGacha += `🪙 +${resultado.valorDinero} 🪙!`;
        }

        guardarTodo();
        mensajeGacha += `\n\n🪙 Saldo: ${u.dinero.toLocaleString()} 🪙 | ⭐ Nivel: ${u.nivel}`;

        try {
            const mediaGacha = await MessageMedia.fromUrl('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600');
            await message.reply(mediaGacha, null, { caption: mensajeGacha });
        } catch (e) {
            await message.reply(mensajeGacha);
        }
    }

    // 29. COMPLETAR CONTRATO DE CAZA (DE LA LISTA PERSONAL)
    else if (texto.toLowerCase().startsWith('.completar')) {
        const costoEnergiaMision = 10;
        if (u.energia < costoEnergiaMision) return message.reply(`⚡ Estás agotado (tienes ${Math.floor(u.energia)}/100).`);

        const idMision = parseInt(texto.replace('.completar', '').trim());
        if (!u.misMisiones) u.misMisiones = [];
        const misionIndex = u.misMisiones.findIndex(m => m.id === idMision);

        if (misionIndex !== -1) {
            const misionEncontrada = u.misMisiones[misionIndex];
            u.energia -= costoEnergiaMision;

            let xpMision = misionEncontrada.xp;
            if (u.raza && u.raza.toLowerCase() === "elfo") xpMision = Math.floor(xpMision * 1.15);

            u.xp += xpMision;
            u.dinero += misionEncontrada.dinero;

            const resNivel = checarSubidaNivel(u);
            
            u.misMisiones[misionIndex] = generarMisionPorRango(u.rango, idMision);
            guardarTodo();

            let respuesta = `🎉 *¡CAZA EXITOSA!*\n🎯 ${misionEncontrada.desc}\n✨ +${xpMision} XP | 🪙 +${misionEncontrada.dinero.toLocaleString()} 🪙\n⚡ Energía: *${Math.floor(u.energia)}/100*`;
            if (resNivel.subio) respuesta += `\n\n🎊 *¡SUBISTE AL NIVEL ${u.nivel} (${u.rango})!*`;
            message.reply(respuesta);
        } else {
            message.reply('❌ No se encontró esa misión en tu tablero personal. Escribe `.misiones` para ver tus contratos actuales.');
        }
    }
});

client.initialize();
// Genera un código numérico de 8 dígitos para vincular sin QR
setTimeout(async () => {
    try {
        const pairingCode = await client.requestPairingCode('5212322456556'); // Reemplaza con tu número real
        console.log('========================================');
        console.log('TU CÓDIGO DE EMPAREJAMIENTO ES:', pairingCode);
        console.log('========================================');
    } catch (error) {
        console.log('Error al solicitar el código:', error);
    }
}, 6000);
