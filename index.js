// ====================== KEEP ALIVE ======================
const express = require("express");
const app = express();

// Página inicial para UptimeRobot
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
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// ====================== VARIÁVEIS DO .ENV =================
const CANAL_PEDIR_SET = process.env.CANAL_PEDIR_SET;
const CANAL_ACEITA_SET = process.env.CANAL_ACEITA_SET;
const CARGO_APROVADO = process.env.CARGO_APROVADO;
const CARGO_APROVADO_2 = process.env.CARGO_APROVADO_2;
const TOKEN = process.env.TOKEN;

// ====================== BOT ONLINE ========================
client.on("ready", async () => {
    console.log(`🤖 Bot ligado como ${client.user.tag}`);

    const canal = await client.channels.fetch(CANAL_PEDIR_SET);

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

    await canal.send({ embeds: [embed], components: [btn] });
    console.log("📩 Mensagem de registro enviada!");
});

// ====================== ABRIR MODAL ========================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== "abrirRegistro") return;

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

    await interaction.showModal(modal);
});

// ====================== RECEBER FORM ========================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== "modalRegistro") return;

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

    await canal.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: "Seu pedido foi enviado!", ephemeral: true });
});

// =================== APROVAR / NEGAR ===================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    const [acao, userId] = interaction.customId.split("_");
    if (!["aprovar", "negar"].includes(acao)) return;

    const membro = await interaction.guild.members.fetch(userId);
    const embedOriginal = interaction.message.embeds[0];

    const nomeInformado = embedOriginal.fields.find(f => f.name === "Nome Informado")?.value;
    const idInformado = embedOriginal.fields.find(f => f.name === "ID Informado")?.value;

    // ======== APROVAR =========
    if (acao === "aprovar") {
        try {
            await membro.setNickname(`A7 ${nomeInformado}`);
            await membro.roles.add([CARGO_APROVADO, CARGO_APROVADO_2]);

            const mensagem = `<a:coroa4:1425236745762504768> **Seja Muito Bem-vindo à Family A7 ** <:emojia7:1429141492080967730>


** Parabéns! Agora vc e um membro oficial da Family A7 , 
Seu set foi aceito , um lugar onde a vibe é diferente,
A resenha aqui e 24 horas por dia, a energia é única e cada pessoa soma do seu próprio jeito... **


✨ **Seja muito bem-vindo!** ✨**`;

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
                .setFooter({ text: "Aprovado com sucesso!" });

            await interaction.update({ embeds: [embedAprovado], components: [] });

        } catch (e) {
            console.log(e);
            return interaction.reply({ content: "❌ Erro ao aprovar.", ephemeral: true });
        }
    }

    // ======== NEGAR =========
    if (acao === "negar") {
        try {
            await membro.kick("Registro negado pelo aprovador.");

            const embedNegado = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Registro Negado")
                .setDescription(`❌ O usuário **${membro.user.tag}** foi expulso.\nNegado por: ${interaction.user}`)
                .setThumbnail(membro.user.displayAvatarURL());

            await interaction.update({ embeds: [embedNegado], components: [] });

        } catch (e) {
            console.log(e);
            return interaction.reply({ content: "❌ Não foi possível expulsar o usuário.", ephemeral: true });
        }
    }
});

// =================== PV PARA TODOS ===================
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith("!pvall")) return;
    if (!message.member.permissions.has("Administrator"))
        return message.reply("❌ Você não tem permissão!");

    const texto = message.content.split(" ").slice(1).join(" ");
    if (!texto) return message.reply("⚠️ Escreva uma mensagem!");

    const members = await message.guild.members.fetch();

    message.reply(`📨 Enviando mensagem para **${members.size} membros**...`);

    let enviados = 0;
    let falhou = 0;

    members.forEach(m => {
        if (m.user.bot) return;
        m.send(`📩 **Família A7:**\n${texto}`)
            .then(() => enviados++)
            .catch(() => falhou++);
    });

    setTimeout(() => {
        message.channel.send(
            `✔️ Mensagens enviadas para **${enviados} membros**.\n⚠️ Falhou em **${falhou} membros** (DM fechada).`
        );
    }, 5000);
});

// ==================== BOT EM CALL 24H ====================
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require("@discordjs/voice");

client.on("ready", async () => {
    try {
        const canal = client.channels.cache.get(process.env.CALL_24H);
        if (!canal) return console.log("❌ Canal de voz não encontrado!");

        const conexao = joinVoiceChannel({
            channelId: canal.id,
            guildId: canal.guild.id,
            adapterCreator: canal.guild.voiceAdapterCreator,
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
}); // FECHA O READY AQUI

// ====================== BOAS-VINDAS ======================
client.on("guildMemberAdd", async (member) => {
    try {

        const canalBoasVindas = member.guild.channels.cache.get(process.env.CANAL_BOAS_VINDAS);

        if (!canalBoasVindas)
            return console.log("❌ Canal de boas-vindas não encontrado!");

        const embed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setTitle("🎉 Bem-vindo(a)!")
            .setDescription(`👋 Olá ${member}, seja bem-vindo(a) ao servidor!`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: "💡 Sabia que...",
                    value: `Você é o Nosso **${member.guild.memberCount}º** membro a entrar no servidor!`,
                    inline: true
                },
                {
                    name: "🏷️ Tag do Usuário",
                    value: `\`${member.user.tag}\`\n(${member.id})`,
                    inline: true
                },
                {
                    name: "❓ Precisando de ajuda?",
                    value: `Em caso de Duvida fale com um <@&1439068773112873114> Pra Cima !`,
                    inline: true
                },
                {
                    name: "⚠️ Evite punições",
                    value: `Leia as https://discord.com/channels/1408821123986231348/1505994371697217676  do servidor para evitar punições!`,
                    inline: false
                }
            )
            .setImage("https://cdn.discordapp.com/attachments/1401678843311427594/1506808671923994766/standard.gif?ex=6a0f9c6e&is=6a0e4aee&hm=c7569bb1a09f40419192809660874aef736c626e01b7292f9c43d012ac20e0a2&")
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
