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
const {
    CANAL_PEDIR_SET,
    CANAL_ACEITA_SET,
    CARGO_APROVADO,
    CARGO_APROVADO_2,
    CANAL_BAN,
    STAFF_ROLE_ID,
    CANAL_MOD,
    CALL_24H,
    TOKEN
} = process.env;

// ====================== FUNÇÃO STAFF ======================
function isStaff(member) {
    return (
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        member.roles.cache.has(STAFF_ROLE_ID)
    );
}

// ====================== WARN DB ======================
const warns = new Map();

// =========================================================
// ====================== READY ============================
// =========================================================
client.on("ready", async () => {
    console.log(`🤖 Bot ligado como ${client.user.tag}`);

    // ====================== SET (NÃO ALTERADO) ======================
    const canalSet = await client.channels.fetch(CANAL_PEDIR_SET).catch(() => null);

    if (canalSet) {
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

        canalSet.send({ embeds: [embed], components: [btn] });
    }

    // ====================== BAN PANEL ======================
    const canalBan = await client.channels.fetch(CANAL_BAN).catch(() => null);

    if (canalBan) {
        const embed = new EmbedBuilder()
            .setTitle("🚫 Sistema de Moderação")
            .setDescription("Painel de moderação")
            .setColor("Red");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ban").setLabel("Ban").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("unban").setLabel("Unban").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("kick").setLabel("Kick").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("warn").setLabel("Warn").setStyle(ButtonStyle.Primary)
        );

        canalBan.send({ embeds: [embed], components: [row] });
    }

    // ====================== CALL 24H ======================
    try {
        const canalVC = client.channels.cache.get(CALL_24H);

        if (canalVC) {
            const conn = joinVoiceChannel({
                channelId: canalVC.id,
                guildId: canalVC.guild.id,
                adapterCreator: canalVC.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            const player = createAudioPlayer();
            const resource = createAudioResource("silencio.mp3");

            player.play(resource);
            conn.subscribe(player);

            console.log("🔊 Call 24h conectado!");
        }
    } catch (err) {
        console.log("Erro VC:", err);
    }

    // ====================== MOD PANEL ======================
    const canalMod = await client.channels.fetch(CANAL_MOD).catch(() => null);

    if (canalMod) {
        const embed = new EmbedBuilder()
            .setTitle("🛡️ Painel de Moderação")
            .setColor("Red");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ban").setLabel("Ban").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("unban").setLabel("Unban").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("kick").setLabel("Kick").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("warn").setLabel("Warn").setStyle(ButtonStyle.Primary)
        );

        canalMod.send({ embeds: [embed], components: [row] });
    }
});

// =========================================================
// ====================== SET SYSTEM =======================
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
            new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel("Aprovar").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`negar_${interaction.user.id}`).setLabel("Negar").setStyle(ButtonStyle.Danger)
        );

        await canal.send({ embeds: [embed], components: [row] });

        return interaction.reply({ content: "Enviado!", ephemeral: true });
    }
});

// =========================================================
// ====================== APPROVE / DENY ===================
// =========================================================
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.isButton()) return;

    const [acao, userId] = interaction.customId.split("_");
    if (!acao || !userId) return;

    if (!["aprovar", "negar"].includes(acao)) return;

    const membro = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!membro) return;

    const nome = interaction.message.embeds[0]?.fields?.find(f => f.name === "Nome")?.value;

    if (acao === "aprovar") {
        await membro.setNickname(`A7 ${nome || "Membro"}`);
        await membro.roles.add([CARGO_APROVADO, CARGO_APROVADO_2]);

        return interaction.update({ content: "Aprovado!", embeds: [], components: [] });
    }

    if (acao === "negar") {
        await membro.kick("Negado");
        return interaction.update({ content: "Negado!", embeds: [], components: [] });
    }
});

// =========================================================
// ====================== MODERATION =======================
// =========================================================
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.guild) return;

    const isButtonOrModal = interaction.isButton() || interaction.isModalSubmit();

    if (isButtonOrModal && !isStaff(interaction.member)) {
        return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
    }

    // ================= MODALS ACTION =================

    if (interaction.customId === "ban_modal") {
        const id = interaction.fields.getTextInputValue("id");
        const motivo = interaction.fields.getTextInputValue("motivo");

        const member = await interaction.guild.members.fetch(id).catch(() => null);
        if (!member) return interaction.reply({ content: "Usuário não encontrado", ephemeral: true });

        await member.ban({ reason: motivo });

        return interaction.reply({ content: "Ban aplicado!", ephemeral: true });
    }

    if (interaction.customId === "unban_modal") {
        const id = interaction.fields.getTextInputValue("id");
        await interaction.guild.bans.remove(id).catch(() => {});

        return interaction.reply({ content: "Unban aplicado!", ephemeral: true });
    }

    if (interaction.customId === "kick_modal") {
        const id = interaction.fields.getTextInputValue("id");
        const motivo = interaction.fields.getTextInputValue("motivo");

        const member = await interaction.guild.members.fetch(id).catch(() => null);
        if (!member) return interaction.reply({ content: "Usuário não encontrado", ephemeral: true });

        await member.kick(motivo);

        return interaction.reply({ content: "Kick aplicado!", ephemeral: true });
    }

    if (interaction.customId === "warn_modal") {
        const id = interaction.fields.getTextInputValue("id");
        const motivo = interaction.fields.getTextInputValue("motivo");

        if (!warns.has(id)) warns.set(id, []);
        warns.get(id).push(motivo);

        return interaction.reply({ content: "Warn aplicado!", ephemeral: true });
    }

    // ================= BUTTON OPEN MODALS =================

    if (interaction.isButton()) {

        const modal = (id, title, fields) => {
            const m = new ModalBuilder().setCustomId(id).setTitle(title);

            m.addComponents(...fields.map(f =>
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId(f.id)
                        .setLabel(f.label)
                        .setStyle(f.style)
                )
            ));

            return m;
        };

        if (interaction.customId === "ban") {
            return interaction.showModal(modal("ban_modal", "Banir Usuário", [
                { id: "id", label: "ID", style: TextInputStyle.Short },
                { id: "motivo", label: "Motivo", style: TextInputStyle.Paragraph }
            ]));
        }

        if (interaction.customId === "unban") {
            return interaction.showModal(modal("unban_modal", "Desbanir Usuário", [
                { id: "id", label: "ID", style: TextInputStyle.Short }
            ]));
        }

        if (interaction.customId === "kick") {
            return interaction.showModal(modal("kick_modal", "Kick Usuário", [
                { id: "id", label: "ID", style: TextInputStyle.Short },
                { id: "motivo", label: "Motivo", style: TextInputStyle.Paragraph }
            ]));
        }

        if (interaction.customId === "warn") {
            return interaction.showModal(modal("warn_modal", "Warn Usuário", [
                { id: "id", label: "ID", style: TextInputStyle.Short },
                { id: "motivo", label: "Motivo", style: TextInputStyle.Paragraph }
            ]));
        }
    }
});

// =========================================================
// ====================== LOGIN ============================
// =========================================================
client.login(TOKEN);
