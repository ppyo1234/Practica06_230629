import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import moment from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import os from "os";
import mongoose from "mongoose";
import Session from "./src/models/session.js";

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

await mongoose.connect("mongodb+srv://230629:a9zkZvci3FqyQe4E@cluster0.y2evu.mongodb.net/usuarios_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
console.log("Conectado a MongoDB");

app.use(
    session({
        secret: "P4-JAGG#ConexionBD-YE",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 5 * 60 * 1000 }, // 5 minutos
    })
);

// Zona horaria por defecto
const TIMEZONE = "America/Mexico_City"; 


// Sesiones almacenadas en memoria
const sessions = {};

// Tiempo máximo de inactividad en milisegundos (2 minutos)
const MAX_INACTIVITY_TIME = 2 * 60 * 1000;

// Intervalo para limpiar sesiones inactivas (cada minuto)
setInterval(() => {
    const now = moment().tz(TIMEZONE);
    for (const sessionId in sessions) {
        const session = sessions[sessionId];
        const lastAccessedAt = moment(session.lastAccessedAt);
        const inactivityDuration = now.diff(lastAccessedAt);

        if (inactivityDuration > MAX_INACTIVITY_TIME) {
            console.log(`Eliminando sesión por inactividad: ${sessionId}`);
            delete sessions[sessionId];
        }
    }
}, 60 * 1000); // Revisión cada minuto

const getClientIp = (req) => {
    let ip = req.headers["x-forwarded-for"] ||
             req.connection?.remoteAddress ||
             req.socket?.remoteAddress ||
             req.connection?.socket?.remoteAddress;

    if (ip && ip.startsWith("::ffff:")) {
        ip = ip.substring(7); // Quitar "::ffff:"
    }

    // Si la IP es localhost (::1 o 127.0.0.1), obtener la IP real del servidor
    if (ip === "::1" || ip === "127.0.0.1") {
        const { serverIp } = getServerNetworkInfo();
        ip = serverIp;
    }

    return ip;
};

const getServerNetworkInfo = () => {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return { serverIp: iface.address, serverMac: iface.mac };
            }
        }
    }
    return { serverIp: "0.0.0.0", serverMac: "00:00:00:00:00:00" };
};

app.post("/login", async (req, res) => {
    const { email, nickname, macAddress } = req.body;

    if (!email || !nickname || !macAddress) {
        return res.status(400).json({ message: "Falta algún campo." });
    }

    const sessionId = uuidv4();
    const clientIp = getClientIp(req);
    const { serverIp, serverMac } = getServerNetworkInfo();
    const now = moment().utc().toDate(); // Guardar en UTC

    try {
        const newSession = new Session({
            sessionId,
            email,
            nickname,
            macAddress,
            ip: clientIp,
            status: "Activa",
            serverIp,
            serverMac,
            createdAt: now,  // Guardar en UTC
            lastAccessedAt: now // Se inicia con el mismo valor que createdAt
        });

        await newSession.save();
        res.status(200).json({ message: "Inicio de sesión exitoso.", sessionId });
    } catch (error) {
        res.status(500).json({ message: "Error al guardar la sesión.", error });
    }
});


// Logout Endpoint
app.post("/logout", async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ message: "Falta el ID de sesión." });
    }

    try {
        const session = await Session.findOne({ sessionId });

        if (!session) {
            return res.status(404).json({ message: "No se encontró la sesión." });
        }

        session.status = "Finalizada por el Usuario";
        session.lastAccessedAt = new Date();
        await session.save();

        res.status(200).json({ message: "Logout exitoso." });
    } catch (error) {
        res.status(500).json({ message: "Error al cerrar la sesión.", error });
    }
});


// Actualización de la sesión
app.post("/update", async (req, res) => {
    const { sessionId, email, nickname } = req.body;

    if (!sessionId) {
        return res.status(400).json({ message: "Falta el ID de sesión." });
    }

    try {
        const session = await Session.findOneAndUpdate(
            { sessionId },
            {
                ...(email && { email }),
                ...(nickname && { nickname }),
                lastAccessedAt: moment().utc().toDate() // Actualizar lastAccessedAt en UTC
            },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ message: "No se encontró la sesión." });
        }

        res.status(200).json({
            message: "Sesión actualizada correctamente.",
            session
        });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar la sesión.", error });
    }
});


// Estado de la sesión
app.get("/status", async (req, res) => {
    const { sessionId } = req.query;
    if (!sessionId) {
        return res.status(400).json({ message: "Falta el ID de sesión." });
    }

    try {
        const session = await Session.findOne({ sessionId });

        if (!session) {
            return res.status(404).json({ message: "No se encontró la sesión." });
        }

        // Convertir de UTC a la zona horaria correcta
        const now = moment().tz(TIMEZONE);
        const lastAccessedAt = moment(session.lastAccessedAt).tz(TIMEZONE);
        const createdAt = moment(session.createdAt).tz(TIMEZONE);

        const inactivityDuration = moment.duration(now.diff(lastAccessedAt));
        const totalDuration = moment.duration(now.diff(createdAt));

        // También actualizar `lastAccessedAt` en la BD para que refleje la consulta
        session.lastAccessedAt = moment().utc().toDate();
        await session.save();

        res.status(200).json({
            message: "Sesión activa.",
            session: {
                sessionId: session.sessionId,
                email: session.email,
                nickname: session.nickname,
                macAddress: session.macAddress,
                ip: session.ip,
                status: session.status,
                createdAt: createdAt.format("YYYY-MM-DD HH:mm:ss"),
                lastAccessedAt: lastAccessedAt.format("YYYY-MM-DD HH:mm:ss"),
                inactivity: `${inactivityDuration.hours()}:${inactivityDuration.minutes()}:${inactivityDuration.seconds()}`,
                totalDuration: `${totalDuration.hours()}:${totalDuration.minutes()}:${totalDuration.seconds()}`,
                serverIp: session.serverIp,
                serverMac: session.serverMac
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Error al recuperar la sesión.", error });
    }
});
// Lista de sesiones activas
app.get("/sessions", async (req, res) => {
    try {
        const sessionList = await Session.find({ status: "Activa" }).lean();
        const now = moment().tz(TIMEZONE);

        const formattedSessions = sessionList.map(session => {
            const createdAt = moment(session.createdAt).tz(TIMEZONE);
            const lastAccessedAt = moment(session.lastAccessedAt).tz(TIMEZONE);
            const inactivityDuration = moment.duration(now.diff(lastAccessedAt));
            const totalDuration = moment.duration(now.diff(createdAt));

            return {
                ...session,
                createdAt: createdAt.format("YYYY-MM-DD HH:mm:ss"),
                lastAccessedAt: lastAccessedAt.format("YYYY-MM-DD HH:mm:ss"),
                inactivity: `${inactivityDuration.hours()}:${inactivityDuration.minutes()}:${inactivityDuration.seconds()}`,
                totalDuration: `${totalDuration.hours()}:${totalDuration.minutes()}:${totalDuration.seconds()}`
            };
        });

        res.status(200).json({
            message: "Sesiones activas:",
            sessions: formattedSessions
        });
    } catch (error) {
        res.status(500).json({ message: "Error al recuperar las sesiones.", error });
    }
});



// Lista de sesiones activas

app.get("/allSessions", async (req, res) => {
    try {
        const sessions = await Session.find();
        res.status(200).json({ message: "Todas las sesiones:", sessions });
    } catch (error) {
        res.status(500).json({ message: "Error al recuperar las sesiones.", error });
    }
});

app.get("/allCurrentSessions", async (req, res) => {
    try {
        const sessions = await Session.find({ status: "Activa" });
        res.status(200).json({ message: "Sesiones activas:", sessions });
    } catch (error) {
        res.status(500).json({ message: "Error al recuperar las sesiones activas.", error });
    }
});

app.delete("/deleteAllSessions", async (req, res) => {
    try {
        await Session.deleteMany({});
        res.status(200).json({ message: "Todas las sesiones han sido eliminadas." });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar las sesiones.", error });
    }
});


// Ruta raíz
app.get("/", (req, res) => {
    return res.status(200).json({
        message: "Bienvenid@ al API de Control de Sesiones",
        author: "José Arturo García González",
    });
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
