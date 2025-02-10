import { generateKeyPairSync } from "crypto";
import { writeFileSync } from "fs";

// Generar par de claves RSA sin cifrado
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" } // Sin cifrado
});

// Guardar claves en archivos
writeFileSync("private.pem", privateKey);
writeFileSync("public.pem", publicKey);

console.log("Claves RSA generadas correctamente.");
