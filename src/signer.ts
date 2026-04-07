import algosdk from "algosdk";

export interface SwyftPaySigner {
  address: string;
  signTransactions(
    txns: Uint8Array[],
    indexesToSign?: number[],
  ): Promise<(Uint8Array | null)[]>;
}

/** AVM_PRIVATE_KEY (base64 64 bytes) to x402 signer. */
export function createSignerFromPrivateKey(
  privateKeyBase64: string,
): SwyftPaySigner {
  const secretKey = Buffer.from(privateKeyBase64, "base64");
  if (secretKey.length !== 64) {
    throw new Error(
      `Invalid key length ${secretKey.length}. Expected 64 bytes (32-byte seed + 32-byte pubkey).`,
    );
  }
  const address = algosdk.encodeAddress(secretKey.slice(32));

  return {
    address,
    signTransactions: async (
      txns: Uint8Array[],
      indexesToSign?: number[],
    ): Promise<(Uint8Array | null)[]> => {
      return txns.map((txnBytes, i) => {
        if (indexesToSign && !indexesToSign.includes(i)) return null;
        const decoded = algosdk.decodeUnsignedTransaction(txnBytes);
        const signed = algosdk.signTransaction(decoded, secretKey);
        return signed.blob;
      });
    },
  };
}

/** 25-word mnemonic to same signer as createSignerFromPrivateKey. */
export function createSignerFromMnemonic(mnemonic: string): SwyftPaySigner {
  const account = algosdk.mnemonicToSecretKey(mnemonic.trim());
  const privateKeyBase64 = Buffer.from(account.sk).toString("base64");
  return createSignerFromPrivateKey(privateKeyBase64);
}
