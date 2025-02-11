import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    nickname: { type: String, required: true },
    macAddress: { type: String, required: true },
    ip: { type: String, required: true },
    status: { 
        type: String, 
        enum: ["Activa", "Inactiva", "Finalizada por el Usuario", "Finalizada por Falla de Sistema"],
        default: "Activa"
    },
    createdAt: { type: String }, 
    lastAccessedAt: { type: String },serverIp: { type: String, required: true },  
    serverMac: { type: String, required: true },
    accumulatedDuration: { type: Number, default: 0 } 
}, { versionKey: false });

const Session = mongoose.model("Session", sessionSchema);
export default Session;
