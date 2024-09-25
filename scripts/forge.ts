import { ethers } from 'hardhat';
import * as forge from 'node-forge';

// Generate a new RSA key pair
export function generateKeyPair() {
    const keypair = forge.pki.rsa.generateKeyPair(2048);
    const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);
    const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);
    return { publicKey, privateKey, address: '' };
}

// Encrypt a message using the public key
export function encryptMessage(message: any, publicKeyPem: any) {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const encrypted = publicKey.encrypt(forge.util.encodeUtf8(message), 'RSA-OAEP');
    return forge.util.encode64(encrypted);
}

// Decrypt a message using the private key
export function decryptMessage(encryptedMessageBase64: string, privateKeyPem: string) {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const encrypted = forge.util.decode64(encryptedMessageBase64);
    const decrypted = privateKey.decrypt(encrypted, 'RSA-OAEP');
    return forge.util.decodeUtf8(decrypted);
}


export function retrievePublicKey(publicKeyBytes: Uint8Array): string {
    // Convert byte array to binary string
    const binaryDerString = Buffer.from(publicKeyBytes).toString('binary');

    // Encode binary string to base64
    const base64Encoded = forge.util.encode64(binaryDerString);

    // Format into PEM-encoded public key
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const pemPublicKey = `${pemHeader}\n${base64Encoded}\n${pemFooter}`;

    return pemPublicKey;
}

export function arrayifyPublicKey(publicKey: string): Uint8Array {
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const pemContents = publicKey.substring(pemHeader.length, publicKey.length - pemFooter.length);
    const binaryDerString = forge.util.decode64(pemContents);
    const publicKeyBytes = ethers.getBytes(Buffer.from(binaryDerString, 'binary'));
    return publicKeyBytes;
}

export function publicKeyToHex(pemPublicKey: string): string {
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const pemContents = pemPublicKey.substring(pemHeader.length, pemPublicKey.length - pemFooter.length);
    const binaryDerString = forge.util.decode64(pemContents);
    const publicKeyBytes = Buffer.from(binaryDerString, 'binary');

    // Convert byte array to hexadecimal string
    return ethers.toBeHex(publicKeyBytes);
}

export function hexToPublicKey(hexPublicKey: string): string {
    // Convert hexadecimal string to byte array
    const publicKeyBytes = ethers.getBytes(hexPublicKey);

    // Convert byte array to binary string
    const binaryDerString = Buffer.from(publicKeyBytes).toString('binary');

    // Encode binary string to base64
    const base64Encoded = forge.util.encode64(binaryDerString);

    // Format into PEM-encoded public key
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const pemPublicKey = `${pemHeader}\n${base64Encoded}\n${pemFooter}`;

    return pemPublicKey;
}

export function publicKeyToBase64(pemPublicKey: string): string {
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const pemContents = pemPublicKey.substring(pemHeader.length, pemPublicKey.length - pemFooter.length);
    return forge.util.decode64(pemContents);
}

export function fromBase64ToPublicKey(base64PublicKey: string): string {
    const base64Encoded = forge.util.encode64(base64PublicKey);
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    return `${pemHeader}\r\n${base64Encoded}\r\n${pemFooter}`;
}

export function base64ToBytes(base64String: string): Uint8Array {
    const binaryDerString = forge.util.decode64(base64String);
    return Buffer.from(binaryDerString, 'binary');
}

export function bytesToBase64(bytes: Uint8Array): string {
    const binaryDerString = Buffer.from(bytes).toString('binary');
    return forge.util.encode64(binaryDerString);
}

export function hexToBytes(hexString: string): Uint8Array {
    return ethers.getBytes(hexString);
}