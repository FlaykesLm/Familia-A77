// ====================== KEEP ALIVE ======================
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot ativo e rodando 24h! 🚀"));
app.listen(3000, () => console.log("🌐 KeepAlive ativo na porta 3000!"));

// ====================== DOTENV ==========================
require("dotenv").config();

// ====================== DISCORD.JS ======================
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events,
    PermissionsBitField
} = require("discord.js");

const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require("@discordjs/voice");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// ====================== ENV ======================
const CANAL_PEDIR_SET = process.env.CANAL_PEDIR_SET;
const CANAL_ACEITA_SET = process.env.CANAL_ACEITA_SET;
const CARGO_APROVADO = process.env.CARGO_APROVADO;
const CARGO_APROVADO_2 = process.env.CARGO_APROVADO_2;

const CANAL_BAN = process.env.CANAL_BAN;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

const TOKEN = process.env.TOKEN;

// ====================== FUNÇÃO STAFF ======================
function isStaff(member) {
    return (
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        member.roles.cache.has(STAFF_ROLE_ID)
    );
}

// ====================== BOT ONLINE ========================
client.on("ready", async () => {
    console.log(`🤖 Bot ligado como ${client.user.tag}`);

    // ===== SISTEMA A7 =====
    const canal = await client.channels.fetch(CANAL_PEDIR_SET);

    const embed = new EmbedBuilder()
        .setTitle("Sistema Família A7")
        .setDescription("Registro A7.\n\nSolicite SET usando o botão abaixo.")
        .setColor("#f1c40f");

    const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("abrirRegistro")
            .setLabel("Registro")
            .setStyle(ButtonStyle.Primary)
    );

    await canal.send({ embeds: [embed], components: [btn] });

    // ===== PAINEL BAN =====
    const canalBan = await client.channels.fetch(CANAL_BAN).catch(() => null);

    if (canalBan) {
        const painel = new EmbedBuilder()
            .setTitle("🚫 Sistema de Moderação")
            .setDescription("Use os botões para banir ou desbanir usuários.")
            .setColor("Red");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("ban_open")
                .setLabel("Banir usuário")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("unban_open")
                .setLabel("Desbanir usuário")
                .setStyle(ButtonStyle.Success)
        );

        canalBan.send({ embeds: [painel], components: [row] });
    }

    // ===== CALL 24H =====
    try {
        const canalVC = client.channels.cache.get(process.env.CALL_24H);

        if (canalVC) {
            const conexao = joinVoiceChannel({
                channelId: canalVC.id,
                guildId: canalVC.guild.id,
                adapterCreator: canalVC.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            const player = createAudioPlayer();
            const resource = createAudioResource("silencio.mp3");

            player.play(resource);
            conexao.subscribe(player);

            console.log("🔊 Bot conectado em call 24h!");
        }
    } catch (err) {
        console.log("Erro VC:", err);
    }
});

// ====================== REGISTRO A7 ======================
client.on(Events.InteractionCreate, async (interaction) => {

    if (interaction.isButton() && interaction.customId === "abrirRegistro") {

        const modal = new ModalBuilder()
            .setCustomId("modalRegistro")
            .setTitle("Solicitação de Set");

        const nome = new TextInputBuilder()
            .setCustomId("nome")
            .setLabel("Seu nome")
            .setStyle(TextInputStyle.Short);

        const id = new TextInputBuilder()
            .setCustomId("iduser")
            .setLabel("Seu ID")
            .setStyle(TextInputStyle.Short);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nome),
            new ActionRowBuilder().addComponents(id)
        );

        return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "modalRegistro") {

        const nome = interaction.fields.getTextInputValue("nome");
        const iduser = interaction.fields.getTextInputValue("iduser");

        const canal = await client.channels.fetch(CANAL_ACEITA_SET);

        const embed = new EmbedBuilder()
            .setTitle("Novo Pedido de Registro")
            .setColor("#3498db")
            .addFields(
                { name: "Usuário", value: `${interaction.user}` },
                { name: "Nome", value: nome },
                { name: "ID", value: iduser }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`aprovar_${interaction.user.id}`)
                .setLabel("Aprovar")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`negar_${interaction.user.id}`)
                .setLabel("Negar")
                .setStyle(ButtonStyle.Danger)
        );

        await canal.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: "Enviado!", ephemeral: true });
    }
});

// ====================== APROVAR / NEGAR ======================
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.isButton()) return;

    const [acao, userId] = interaction.customId.split("_");
    if (!["aprovar", "negar"].includes(acao)) return;

    const membro = await interaction.guild.members.fetch(userId);
    const embedOriginal = interaction.message.embeds[0];

    const nome = embedOriginal.fields.find(f => f.name === "Nome")?.value;

    if (acao === "aprovar") {
        await membro.setNickname(`A7 ${nome}`);
        await membro.roles.add([CARGO_APROVADO, CARGO_APROVADO_2]);

        await interaction.update({
            content: "Aprovado!",
            embeds: [],
            components: []
        });
    }

    if (acao === "negar") {
        await membro.kick("Negado");

        await interaction.update({
            content: "Negado!",
            embeds: [],
            components: []
        });
    }
});

// ====================== PVALL ======================
client.on("messageCreate", async (message) => {

    if (!message.content.startsWith("!pvall")) return;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("Sem permissão!");
    }

    const texto = message.content.split(" ").slice(1).join(" ");

    const members = await message.guild.members.fetch();

    let enviados = 0;

    members.forEach(m => {
        if (!m.user.bot) {
            m.send(texto).then(() => enviados++).catch(() => {});
        }
    });

    message.reply("Enviado para membros!");
});

// ====================== BAN SYSTEM ======================
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.guild) return;

    if ((interaction.isButton() || interaction.isModalSubmit()) && !isStaff(interaction.member)) {
        return interaction.reply({ content: "Sem permissão.", ephemeral: true });
    }

    // BAN OPEN
    if (interaction.isButton() && interaction.customId === "ban_open") {

        const modal = new ModalBuilder()
            .setCustomId("ban_modal")
            .setTitle("Banir Usuário");

        const user = new TextInputBuilder()
            .setCustomId("user")
            .setLabel("ID do usuário")
            .setStyle(TextInputStyle.Short);

        const reason = new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Motivo")
            .setStyle(TextInputStyle.Paragraph);

        modal.addComponents(
            new ActionRowBuilder().addComponents(user),
            new ActionRowBuilder().addComponents(reason)
        );

        return interaction.showModal(modal);
    }

    // UNBAN OPEN
    if (interaction.isButton() && interaction.customId === "unban_open") {

        const modal = new ModalBuilder()
            .setCustomId("unban_modal")
            .setTitle("Desbanir Usuário");

        const user = new TextInputBuilder()
            .setCustomId("user")
            .setLabel("ID do usuário")
            .setStyle(TextInputStyle.Short);

        modal.addComponents(
            new ActionRowBuilder().addComponents(user)
        );

        return interaction.showModal(modal);
    }

    // BAN
    if (interaction.isModalSubmit() && interaction.customId === "ban_modal") {

        const userId = interaction.fields.getTextInputValue("user");
        const reason = interaction.fields.getTextInputValue("reason");

        const embed = new EmbedBuilder()
            .setTitle("🚫 Usuário Banido")
            .addFields(
                { name: "Usuário", value: `<@${userId}>` },
                { name: "Motivo", value: reason },
                { name: "Staff", value: `<@${interaction.user.id}>` }
            )
            .setColor("DarkRed");

        await interaction.reply({ content: "Ban registrado!", ephemeral: true });

        const canal = await client.channels.fetch(CANAL_BAN);
        canal?.send({ embeds: [embed] });
    }

    // UNBAN
    if (interaction.isModalSubmit() && interaction.customId === "unban_modal") {

        const userId = interaction.fields.getTextInputValue("user");

        const embed = new EmbedBuilder()
            .setTitle("✅ Usuário Desbanido")
            .addFields(
                { name: "Usuário", value: `<@${userId}>` },
                { name: "Staff", value: `<@${interaction.user.id}>` }
            )
            .setColor("Green");

        await interaction.reply({ content: "Desban registrado!", ephemeral: true });

        const canal = await client.channels.fetch(CANAL_BAN);
        canal?.send({ embeds: [embed] });
    }
});

// ====================== BOAS VINDAS ======================
client.on("guildMemberAdd", async (member) => {

    const canal = member.guild.channels.cache.get(process.env.CANAL_BOAS_VINDAS);
    if (!canal) return;

    const embed = new EmbedBuilder()
        .setTitle("Bem-vindo!")
        .setDescription(`Olá ${member}`)
        .setColor("Blue");

    canal.send({ embeds: [embed] });
});

client.login(TOKEN);
