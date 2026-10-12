// Cria uma conta de administrador.
//
// Substitui a antiga rota POST /api/admin/create, que estava protegida apenas
// por um segredo escrito no código e, com o repositório público, permitia a
// qualquer pessoa criar um admin e entrar no painel.
//
// Criar contas é uma operação de instalação, não uma função do site: fica aqui,
// onde só corre quem tem acesso à máquina e à DATABASE_URL.
//
// Uso:  node scripts/create-admin.mjs <username>
// A password é pedida a seguir e não aparece no ecrã nem no histórico da shell.

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";

function getDatabaseUrl() {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

    try {
        const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
        const match = env.match(/^DATABASE_URL=(.*)$/m);
        if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    } catch {
        // sem .env: segue para o erro abaixo
    }

    console.error("DATABASE_URL não encontrado (nem no ambiente nem no .env)");
    process.exit(1);
}

// Lê a password sem a mostrar no terminal
function promptPassword(question) {
    return new Promise((resolve) => {
        const { stdin, stdout } = process;

        stdout.write(question);
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding("utf8");

        let value = "";

        const onData = (char) => {
            // Ctrl+C
            if (char === "\u0003") {
                stdin.setRawMode(false);
                stdout.write("\n");
                process.exit(130);
            }
            // Enter
            if (char === "\r" || char === "\n") {
                stdin.setRawMode(false);
                stdin.pause();
                stdin.removeListener("data", onData);
                stdout.write("\n");
                resolve(value);
                return;
            }
            // Backspace
            if (char === "\u007f" || char === "\b") {
                value = value.slice(0, -1);
                return;
            }
            value += char;
        };

        stdin.on("data", onData);
    });
}

const username = process.argv[2];

if (!username) {
    console.error("Uso: node scripts/create-admin.mjs <username>");
    process.exit(1);
}

const sql = neon(getDatabaseUrl());

const existing = await sql`SELECT id FROM admin_users WHERE username = ${username}`;
if (existing.length > 0) {
    console.error(`Já existe um administrador com o username "${username}"`);
    process.exit(1);
}

if (!process.stdin.isTTY) {
    console.error(
        "É preciso um terminal interativo para escrever a password.\n" +
        "Corra o comando diretamente na shell, sem redirecionar a entrada."
    );
    process.exit(1);
}

const password = await promptPassword(`Password para "${username}": `);

if (password.length < 10) {
    console.error("A password tem de ter pelo menos 10 caracteres");
    process.exit(1);
}

const confirmation = await promptPassword("Repita a password: ");

if (password !== confirmation) {
    console.error("As passwords não coincidem");
    process.exit(1);
}

const hashed = await bcrypt.hash(password, 10);
await sql`INSERT INTO admin_users (username, password) VALUES (${username}, ${hashed})`;

console.log(`Administrador "${username}" criado. Já pode entrar em /admin/login`);
