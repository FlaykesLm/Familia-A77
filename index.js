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

// ====================== VOICE ======================
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource
} = require("@discordjs/voice");

// ====================== CLIENT ======================
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
    STAFF_ROLE_ID,
    CANAL_MOD,
    CANAL_PUNICOES,
    TOKEN
} = process.env;

// ====================== DB ======================
const warns = new Map();

// ====================== STAFF CHECK ======================
function isStaff(member) {
    return (
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        member.roles.cache.has(STAFF_ROLE_ID)
    );
}

// =========================================================
// ====================== READY ============================
// =========================================================
client.on("ready", async () => {

    console.log(`🤖 Bot ligado como ${client.user.tag}`);

    // ================= SET PANEL =================
    const canal = await client.channels.fetch(CANAL_PEDIR_SET).catch(() => null);

    if (canal) {

        const embed = new EmbedBuilder()
            .setTitle("Sistema Família A7")
            .setDescription(
                "Registro A7.\n\nSolicite SET usando o botão abaixo.\nPreencha com atenção!"
            )
            .addFields({
                name: "📌 Lembretes",
                value: "• A resenha aqui é garantida.\n• Não leve tudo a sério.",
            })
            .setColor("#f1c40f");

        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("abrirRegistro")
                .setLabel("Registro")
                .setStyle(ButtonStyle.Primary)
        );

        await canal.send({
            embeds: [embed],
            components: [btn]
        });

        console.log("📩 Painel enviado!");
    }

    // ================= MOD PANEL =================
    const canalMod = await client.channels.fetch(CANAL_MOD).catch(() => null);

    if (canalMod) {

        const embed = new EmbedBuilder()
            .setTitle(" <:emojia7:1429141492080967730> Moderação A7 ")
            .setDescription("Ban : Banir Usuario\nUnban : Remover\nKick : Expulsar do Server\nWarn : Adv - 3 Adv e Kick do server")
            .setColor("Red");

        const row = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("ban")
                .setLabel("Ban")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("unban")
                .setLabel("Unban")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("kick")
                .setLabel("Kick")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("warn")
                .setLabel("Warn")
                .setStyle(ButtonStyle.Primary)
        );

        await canalMod.send({
            embeds: [embed],
            components: [row]
        });

        console.log("🛡️ Painel mod enviado!");
    }

    // ==================== BOT EM CALL 24H ====================
    try {

        const canalVoice = client.channels.cache.get(process.env.CALL_24H);

        if (!canalVoice) {
            return console.log("❌ Canal de voz não encontrado!");
        }

        const conexao = joinVoiceChannel({
            channelId: canalVoice.id,
            guildId: canalVoice.guild.id,
            adapterCreator: canalVoice.guild.voiceAdapterCreator,
            selfDeaf: false
        });

        const player = createAudioPlayer();
        const resource = createAudioResource("silencio.mp3");

        player.play(resource);
        conexao.subscribe(player);

        console.log("🔊 Bot conectado em call 24h!");

    } catch (err) {

        console.log("Erro ao conectar no VC:", err);
    }
});

// =========================================================
// ====================== INTERACTIONS =====================
// =========================================================
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.guild) return;

    // ====================== ABRIR MODAL ======================
    if (interaction.isButton() && interaction.customId === "abrirRegistro") {

        const modal = new ModalBuilder()
            .setCustomId("modalRegistro")
            .setTitle("Solicitação de Set");

        const nome = new TextInputBuilder()
            .setCustomId("nome")
            .setLabel("Seu nome*")
            .setRequired(true)
            .setStyle(TextInputStyle.Short);

        const id = new TextInputBuilder()
            .setCustomId("iduser")
            .setLabel("Seu ID*")
            .setRequired(true)
            .setStyle(TextInputStyle.Short);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nome),
            new ActionRowBuilder().addComponents(id)
        );

        return interaction.showModal(modal);
    }

    // ====================== RECEBER FORM ======================
    if (interaction.isModalSubmit() && interaction.customId === "modalRegistro") {

        const nome = interaction.fields.getTextInputValue("nome");
        const iduser = interaction.fields.getTextInputValue("iduser");

        const canal = await client.channels.fetch(CANAL_ACEITA_SET);

        const embed = new EmbedBuilder()
            .setTitle("Novo Pedido de Registro")
            .setColor("#3498db")
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: "Usuário", value: `${interaction.user}` },
                { name: "Nome Informado", value: nome },
                { name: "ID Informado", value: iduser },
                {
                    name: "Conta Criada em",
                    value: `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>`,
                }
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

        await canal.send({
            embeds: [embed],
            components: [row]
        });

        return interaction.reply({
            content: "Seu pedido foi enviado!",
            ephemeral: true
        });
    }

    // ====================== APROVAR / NEGAR ======================
    if (interaction.isButton()) {

        const [acao, userId] = interaction.customId.split("_");

        if (["aprovar", "negar"].includes(acao)) {

            const membro = await interaction.guild.members.fetch(userId).catch(() => null);

            if (!membro) {
                return interaction.reply({
                    content: "Usuário não encontrado.",
                    ephemeral: true
                });
            }

            const embedOriginal = interaction.message.embeds[0];

            const nomeInformado =
                embedOriginal.fields.find(f => f.name === "Nome Informado")?.value;

            const idInformado =
                embedOriginal.fields.find(f => f.name === "ID Informado")?.value;

            // ================= APROVAR =================
            if (acao === "aprovar") {

                try {

                    await membro.setNickname(`A7 ${nomeInformado}`);

                    await membro.roles.add([
                        CARGO_APROVADO,
                        CARGO_APROVADO_2
                    ]);

                    const mensagem = `
<a:coroa4:1425236745762504768> **Seja Muito Bem-vindo à Family A7** <:emojia7:1429141492080967730>

**Parabéns! Agora vc é um membro oficial da Family A7**
`;

                    await membro.send(mensagem).catch(() => {});

                    const embedAprovado = new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("Registro Aprovado")
                        .addFields(
                            { name: "👤 Usuário:", value: `${membro}` },
                            { name: "🪪 ID:", value: `${idInformado}` },
                            { name: "📛 Nome Informado:", value: `A7 ${nomeInformado}` },
                            { name: "🧭 Acesso aprovado por:", value: `${interaction.user}` }
                        )
                        .setThumbnail(membro.user.displayAvatarURL())
                        .setFooter({
                            text: "Aprovado com sucesso!"
                        });

                    await interaction.update({
                        embeds: [embedAprovado],
                        components: []
                    });

                } catch (e) {

                    console.log(e);

                    return interaction.reply({
                        content: "❌ Erro ao aprovar.",
                        ephemeral: true
                    });
                }
            }

            // ================= NEGAR =================
            if (acao === "negar") {

                try {

                    await membro.kick("Registro negado.");

                    const embedNegado = new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("Registro Negado")
                        .setDescription(
                            `❌ O usuário **${membro.user.tag}** foi expulso.\nNegado por: ${interaction.user}`
                        )
                        .setThumbnail(membro.user.displayAvatarURL());

                    await interaction.update({
                        embeds: [embedNegado],
                        components: []
                    });

                } catch (e) {

                    console.log(e);

                    return interaction.reply({
                        content: "❌ Não foi possível expulsar.",
                        ephemeral: true
                    });
                }
            }
        }
    }

    // ====================== BOTÕES MOD ======================
    if (interaction.isButton()) {

        const criarModal = (id, title, fields) => {

            const modal = new ModalBuilder()
                .setCustomId(id)
                .setTitle(title);

            modal.addComponents(
                ...fields.map(f =>
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId(f.id)
                            .setLabel(f.label)
                            .setStyle(f.style)
                    )
                )
            );

            return modal;
        };

        // ===== BAN =====
        if (interaction.customId === "ban") {

            return interaction.showModal(
                criarModal("ban_modal", "Banir Usuário", [
                    {
                        id: "id",
                        label: "ID do usuário",
                        style: TextInputStyle.Short
                    },
                    {
                        id: "motivo",
                        label: "Motivo",
                        style: TextInputStyle.Paragraph
                    }
                ])
            );
        }

        // ===== UNBAN =====
        if (interaction.customId === "unban") {

            return interaction.showModal(
                criarModal("unban_modal", "Desbanir Usuário", [
                    {
                        id: "id",
                        label: "ID do usuário",
                        style: TextInputStyle.Short
                    }
                ])
            );
        }

        // ===== KICK =====
        if (interaction.customId === "kick") {

            return interaction.showModal(
                criarModal("kick_modal", "Kick Usuário", [
                    {
                        id: "id",
                        label: "ID do usuário",
                        style: TextInputStyle.Short
                    },
                    {
                        id: "motivo",
                        label: "Motivo",
                        style: TextInputStyle.Paragraph
                    }
                ])
            );
        }

        // ===== WARN =====
        if (interaction.customId === "warn") {

            return interaction.showModal(
                criarModal("warn_modal", "Warn Usuário", [
                    {
                        id: "id",
                        label: "ID do usuário",
                        style: TextInputStyle.Short
                    },
                    {
                        id: "motivo",
                        label: "Motivo",
                        style: TextInputStyle.Paragraph
                    }
                ])
            );
        }
    }

    // ====================== MODALS MOD ======================
    if (interaction.isModalSubmit()) {

        // ================= BAN =================
        if (interaction.customId === "ban_modal") {

            const id = interaction.fields.getTextInputValue("id");
            const motivo = interaction.fields.getTextInputValue("motivo");

            const member = await interaction.guild.members.fetch(id).catch(() => null);

            if (!member) {
                return interaction.reply({
                    content: "Usuário não encontrado",
                    ephemeral: true
                });
            }

            await member.ban({ reason: motivo });

            const canalPunicoes = await client.channels.fetch(CANAL_PUNICOES);

            const hora = new Date().toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo"
            });

            const embedPunicao = new EmbedBuilder()
                .setColor("Red")
                .setTitle("🛡️ Moderação A7 ")
                .addFields(
                    {
                        name: "👤 Usuário",
                        value: `${member.user}`,
                    },
                    {
                        name: "📌 Punição",
                        value: "Ban",
                    },
                    {
                        name: "📝 Motivo",
                        value: motivo,
                    },
                    {
                        name: "🕒 Data e Hora",
                        value: hora,
                    },
                    {
                        name: "🛡️ Quem aplicou",
                        value: `${interaction.user}`,
                    }
                )
                .setThumbnail(member.user.displayAvatarURL());

            await canalPunicoes.send({
                embeds: [embedPunicao]
            });

            return interaction.reply({
                content: "✅ Ban aplicado!",
                ephemeral: true
            });
        }

        // ================= UNBAN =================
        if (interaction.customId === "unban_modal") {

            const id = interaction.fields.getTextInputValue("id");

            await interaction.guild.bans.remove(id).catch(() => {});

            return interaction.reply({
                content: "✅ Ban removido!",
                ephemeral: true
            });
        }

        // ================= KICK =================
        if (interaction.customId === "kick_modal") {

            const id = interaction.fields.getTextInputValue("id");
            const motivo = interaction.fields.getTextInputValue("motivo");

            const member = await interaction.guild.members.fetch(id).catch(() => null);

            if (!member) {
                return interaction.reply({
                    content: "Usuário não encontrado",
                    ephemeral: true
                });
            }

            await member.kick(motivo);

            return interaction.reply({
                content: "✅ Kick aplicado!",
                ephemeral: true
            });
        }

        // ================= WARN =================
        if (interaction.customId === "warn_modal") {

            const id = interaction.fields.getTextInputValue("id");
            const motivo = interaction.fields.getTextInputValue("motivo");

            if (!warns.has(id)) warns.set(id, []);

            warns.get(id).push(motivo);

            return interaction.reply({
                content: "✅ Warn aplicado!",
                ephemeral: true
            });
        }
    }
});

// ====================== BOAS-VINDAS ======================
client.on("guildMemberAdd", async (member) => {

    try {

        const canalBoasVindas =
            member.guild.channels.cache.get(process.env.CANAL_BOAS_VINDAS);

        if (!canalBoasVindas) {
            return console.log("❌ Canal de boas-vindas não encontrado!");
        }

        const embed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setTitle("🎉 Bem-vindo(a)!")
            .setDescription(`👋 Olá ${member}, seja bem-vindo(a) ao servidor!`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: "Familia A7",
                    value: `Você é o **${member.guild.memberCount}º** membro a entrar no servidor!`,
                    inline: true
                },
                {
                    name: "🏷️ Tag do Usuário",
                    value: `\`${member.user.tag}\`\n(${member.id})`,
                    inline: true
                },
                {
                    name: "❓ Precisando de ajuda?",
                    value: `Caso você tenha alguma dúvida ou problema, chame a equipe!`,
                    inline: true
                },
                {
                    name: "⚠️ Evite punições",
                    value: "Leia as regras do servidor para evitar punições!",
                    inline: false
                }
            )
            .setImage("https://cdn.discordapp.com/attachments/1401678843311427594/1506808671923994766/standard.gif?ex=6a1196ae&is=6a10452e&hm=93c394709ee1105e93eb4fb377a6a0a6e9db72cbbf98bb48037d3f5b2e2cb564&")
            .setFooter({
                text: "Todos os direitos reservados."
            })
            .setTimestamp();

        await canalBoasVindas.send({
            content: `🎉 ${member}`,
            embeds: [embed]
        });

    } catch (err) {

        console.log("Erro na mensagem de boas-vindas:", err);
    }
});

client.login(TOKEN);
