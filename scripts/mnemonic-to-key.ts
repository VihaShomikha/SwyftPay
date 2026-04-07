// Prints AVM_PRIVATE_KEY and AVM_ADDRESS from DEPLOYER_MNEMONIC or argv.
import algosdk from "algosdk";
import "dotenv/config";

const mnemonic =
  process.env.DEPLOYER_MNEMONIC ?? process.argv.slice(2).join(" ");

if (!mnemonic || mnemonic.split(" ").length < 25) {
  console.error(
    "Usage: Set DEPLOYER_MNEMONIC in .env or pass 25-word mnemonic as arguments.",
  );
  process.exit(1);
}

const account = algosdk.mnemonicToSecretKey(mnemonic.trim());
const privateKeyBase64 = Buffer.from(account.sk).toString("base64");

console.log("┌──────────────────────────────────────────────────────────────┐");
console.log("│  SwyftPay — Mnemonic → Key Converter                        │");
console.log("├──────────────────────────────────────────────────────────────┤");
console.log(`│  Address:         ${account.addr}`);
console.log(`│  AVM_PRIVATE_KEY: ${privateKeyBase64.slice(0, 40)}…`);
console.log("├──────────────────────────────────────────────────────────────┤");
console.log("│  Add these to your .env:                                     │");
console.log(`│    AVM_PRIVATE_KEY=${privateKeyBase64}`);
console.log(`│    AVM_ADDRESS=${account.addr}`);
console.log(`│    RESOURCE_PAY_TO=${account.addr}`);
console.log("└──────────────────────────────────────────────────────────────┘");
