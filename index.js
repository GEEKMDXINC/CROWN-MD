// Vérifie si le serveur doit être lancé
if (process.argv.includes('--server')) {
    require('./server');
}

// Chargement des variables d'environnement
require('dotenv').config();
require('rootpath')();

const { spawn } = require('child_process');
const { Function: Func } = new (require('@neoxr/wb'));
const path = require('path');
const colors = require('@colors/colors/safe');
const CFonts = require('cfonts');
const chalk = require('chalk');
const fs = require('fs');

// Gestion des promesses non traitées
const unhandledRejections = new Map();
process.on('unhandledRejection', (reason, promise) => {
    unhandledRejections.set(promise, reason);
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('rejectionHandled', (promise) => {
    unhandledRejections.delete(promise);
});
process.on('uncaughtException', (err) => {
    console.log('Caught exception: ', err);
});

// Fonction pour lire et mettre à jour config.json
function updateConfig() {
    const conf = JSON.parse(fs.readFileSync('./config.json'));
    conf.pairing.number = process.env.BOT_NUMBER;
    fs.writeFileSync('./config.json', JSON.stringify(conf, null, 2)); // Écriture avec indentation pour lisibilité
}

// Fonction pour démarrer le processus
function start() {
    const args = [path.join(__dirname, 'client.js'), ...process.argv.slice(2)];
    const p = spawn(process.argv[0], args, { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });

    p.on('message', (data) => {
        if (data === 'reset') {
            console.log('Restarting...');
            p.kill();
            delete p;
        }
    });

    p.on('exit', (code) => {
        console.error('Exited with code:', code);
        start();
    });
}

// Affichage des messages de bienvenue
CFonts.say('SUKUNA BOT', {
    font: 'tiny',
    align: 'center',
    colors: ['system']
});
CFonts.say('Github : https://github.com/andymrlit', {
    colors: ['system'],
    font: 'console',
    align: 'center'
});

// Fonction pour vérifier les mises à jour
async function checkUpdate() {
    try {
        const vcode = require('./version.json').semantic.version;
        const json = await Func.fetchJson('https://neoxr.my.id/check-update/version?type=beta');
        if (json.status && json.data.version !== vcode) {
            return {
                update: true,
                ...json.data
            };
        }
        return {
            update: false
        };
    } catch (e) {
        console.log(e);
        return {
            update: false
        };
    }
}

// Mise à jour de la configuration, vérification des mises à jour ou démarrage du bot
updateConfig();
checkUpdate().then((json) => {
    if (json.update) {
        const vcode = require('./version.json').semantic.version;
        let message = chalk.black(chalk.bgGreen(` Update available ${vcode} ~> ${json.version} `));
        message += `\n\n${json.commit}\n\n`;
        message += chalk.green(json.url);
        console.log(message);
    } else {
        start();
    }
});
