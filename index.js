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

// ====================== DB WARN ======================
const warns = new Map();

// =========================================================
// ====================== BOT ONLINE =======================
// =========================================================
client.on("ready", async () => {
    console.log(`🤖 Bot ligado como ${client.user.tag}`);

    // ====================== SEU SET (NÃO ALTERADO) ======================
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

    // ====================== PAINEL BAN ======================
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

    // ====================== CALL 24H ======================
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

    // ====================== PAINEL MOD ======================
    try {
        const canalMod = await client.channels.fetch(process.env.CANAL_MOD);

        const embed = new EmbedBuilder()
            .setTitle("🛡️ Painel de Moderação")
            .setDescription("Sistema completo de staff")
            .setColor("Red");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ban").setLabel("Ban").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("unban").setLabel("Unban").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("kick").setLabel("Kick").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("warn").setLabel("Warn").setStyle(ButtonStyle.Primary)
        );

        canalMod.send({ embeds: [embed], components: [row] });

    } catch (e) {
        console.log(e);
    }
});

// =========================================================
// ====================== REGISTRO A7 (NÃO ALTERADO) =======
// =========================================================
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

// ====================== APROVAR / NEGAR (NÃO ALTERADO) ======================
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

// ====================== MODERAÇÃO ======================
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.guild) return;

    if ((interaction.isButton() || interaction.isModalSubmit()) &&
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !interaction.member.roles.cache.has(STAFF_ROLE_ID)
    ) {
        return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
    }

    // BAN MODAL
    if (interaction.customId === "ban_modal") {
        const id = interaction.fields.getTextInputValue("id");
        const motivo = interaction.fields.getTextInputValue("motivo");

        const member = await interaction.guild.members.fetch(id).catch(() => null);
        if (!member) return interaction.reply({ content: "Usuário não encontrado", ephemeral: true });

        await member.ban({ reason: motivo });

        return interaction.reply({ content: "Ban aplicado!", ephemeral: true });
    }

    // UNBAN
    if (interaction.customId === "unban_modal") {
        const id = interaction.fields.getTextInputValue("id");

        await interaction.guild.bans.remove(id).catch(() => {});

        return interaction.reply({ content: "Unban aplicado!", ephemeral: true });
    }

    // KICK
    if (interaction.customId === "kick_modal") {
        const id = interaction.fields.getTextInputValue("id");
        const motivo = interaction.fields.getTextInputValue("motivo");

        const member = await interaction.guild.members.fetch(id).catch(() => null);
        if (!member) return interaction.reply({ content: "Usuário não encontrado", ephemeral: true });

        await member.kick(motivo);

        return interaction.reply({ content: "Kick aplicado!", ephemeral: true });
    }

    // WARN
    if (interaction.customId === "warn_modal") {
        const id = interaction.fields.getTextInputValue("id");
        const motivo = interaction.fields.getTextInputValue("motivo");

        if (!warns.has(id)) warns.set(id, []);
        warns.get(id).push(motivo);

        return interaction.reply({ content: "Warn aplicado!", ephemeral: true });
    }

    // BOTÕES MODAL ABRIR
    if (interaction.isButton()) {

        if (interaction.customId === "ban") {
            const modal = new ModalBuilder()
                .setCustomId("ban_modal")
                .setTitle("Banir Usuário");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("id").setLabel("ID").setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(TextInputStyle.Paragraph)
                )
            );

            return interaction.showModal(modal);
        }

        if (interaction.customId === "unban") {
            const modal = new ModalBuilder()
                .setCustomId("unban_modal")
                .setTitle("Desbanir Usuário");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("id").setLabel("ID").setStyle(TextInputStyle.Short)
                )
            );

            return interaction.showModal(modal);
        }

        if (interaction.customId === "kick") {
            const modal = new ModalBuilder()
                .setCustomId("kick_modal")
                .setTitle("Kick Usuário");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("id").setLabel("ID").setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(TextInputStyle.Paragraph)
                )
            );

            return interaction.showModal(modal);
        }

        if (interaction.customId === "warn") {
            const modal = new ModalBuilder()
                .setCustomId("warn_modal")
                .setTitle("Warn Usuário");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("id").setLabel("ID").setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(TextInputStyle.Paragraph)
                )
            );

            return interaction.showModal(modal);
        }
    }
});

// ====================== LOGIN ======================
client.login(TOKEN);
