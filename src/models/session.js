import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    nickname: { type: String, required: true },
    status: { 
        type: String, 
        enum: ["Activa", "Inactiva", "Finalizada por el Usuario", "Finalizada por Falla de Sistema"],
        default: "Activa"
    },
    createdAt: { 
        type: String, 
        required: true 
    },
    lastAccessedAt: { 
        type: String
    },
    clientData: {
        ip: { type: String, required: true },
        macAddress: { type: String, required: true }
    },
    serverData: {
        ip: { type: String, required: true },
        macAddress: { type: String, required: true }
    },
    inactivityTime: {
        hours: { type: Number, required: true, min: 0 }
    },
    accumulatedDuration: { type: Number, default: 0 } 
}, { versionKey: false });

const Session = mongoose.model("Session", sessionSchema);
export default Session;
