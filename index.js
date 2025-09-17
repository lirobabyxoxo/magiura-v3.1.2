const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

// Simple database replacement
const dbPath = path.join(__dirname, "database.json");
const db = {
  get: (key) => {
    try {
      const data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      return data[key] || null;
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      } catch {}
      data[key] = value;
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
      return value;
    } catch {
      return null;
    }
  },
  delete: (key) => {
    try {
      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      } catch {}
      delete data[key];
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
      return true;
    } catch {
      return false;
    }
  },
};

// Create client with basic intents
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS, 
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS
  ],
});

console.log("Starting bot...");

// Commands
const commands = new Map();

// Help command
commands.set("help", {
  run: (client, message, args) => {
    const embed = new MessageEmbed()
      .setTitle("🤖 Help - Comandos Disponíveis")
      .setDescription(
        `**📋 Verificação:**
> \`${config.prefix}setverify\` \`${config.prefix}setrole\` \`${config.prefix}verify\` \`${config.prefix}resetallverify\`

**👮 Administração:**
> \`${config.prefix}vaza @user [motivo]\` - Banir membro
> \`${config.prefix}kick @user [motivo]\` - Expulsar membro  
> \`${config.prefix}mute @user [tempo] [motivo]\` - Silenciar membro
> \`${config.prefix}unmute @user\` - Remover silenciamento
> \`${config.prefix}unban <ID>\` - Desbanir usuário

**🔧 Utilidades:**
> \`${config.prefix}av [@user]\` - Ver avatar
> \`${config.prefix}userinfo [@user]\` - Informações do usuário
> \`${config.prefix}clear <quantidade>\` - Limpar mensagens

**🎭 Roleplay:**
> \`${config.prefix}hug @user\` \`${config.prefix}kiss @user\` \`${config.prefix}kill @user\`
> \`${config.prefix}pat @user\` \`${config.prefix}slap @user\`

**💕 Social:**
> \`${config.prefix}tinder\` - Sistema de relacionamento
> \`${config.prefix}marry @user\` - Pedir em casamento
> \`${config.prefix}divorce\` - Pedir divórcio

**🧹 Limpeza:**
> \`${config.prefix}cl [quantidade]\` - Limpeza rápida
> \`${config.prefix}cl setup\` - Configurar sistema CL

**🎉 Boas-vindas:**
> \`${config.prefix}great\` \`${config.prefix}setwelcome\` \`${config.prefix}setwelcomerole\``,
      )
      .setColor("#000000")
      .setTimestamp()
      .setFooter("Use os comandos sem parâmetros para mais detalhes");
    message.channel.send({ embeds: [embed] });
  },
});

// Set verify channel
commands.set("setverify", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.channel.send(
        "Por favor, mencione o canal de verificação.",
      );
    }
    db.set(`verify_${message.guild.id}`, channel.id);
    message.channel.send(
      `Agora ${channel} foi setado como canal de verificação`,
    );
  },
});

// Set verification role
commands.set("setrole", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    const role = message.mentions.roles.first();
    if (!role) {
      return message.channel.send(
        "Por favor, mencione o cargo que será dado na verificação.",
      );
    }
    db.set(`verole_${message.guild.id}`, role.id);
    message.channel.send(`Agora \`${role}\` será dado quando eles verificarem`);
  },
});

// Set removal role
commands.set("setrrole", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    const role = message.mentions.roles.first();
    if (!role) {
      return message.channel.send(
        "Por favor, mencione o cargo que será removido na verificação.",
      );
    }
    db.set(`srrole_${message.guild.id}`, role.id);
    message.channel.send(
      `Agora \`${role}\` será tirado quando eles verificarem`,
    );
  },
});

// Verify command
commands.set("verify", {
  run: async (client, message, args) => {
    const rRole = db.get(`verole_${message.guild.id}`);
    const rerole = db.get(`srrole_${message.guild.id}`);
    const chx = db.get(`verify_${message.guild.id}`);

    if (!chx) {
      return message.channel.send(
        "Canal de verificação não configurado. Use `.setverify #channel` para configurar.",
      );
    }

    if (message.channel.id !== chx) {
      return; // Only work in verification channel
    }

    if (!rRole) {
      return message.channel.send(
        "O cargo de verificação não foi configurado. Use `.setrole @role` para configurar.",
      );
    }

    const myRole = message.guild.roles.cache.get(rRole);
    if (!myRole) {
      return message.channel.send(
        "O cargo de verificação não existe mais. Entre em contato com um administrador.",
      );
    }

    try {
      await message.member.roles.add(myRole);

      if (rerole) {
        const reerole = message.guild.roles.cache.get(rerole);
        if (reerole) {
          await message.member.roles.remove(reerole);
        }
      }

      message.author
        .send(`Você foi verificado(a) em ${message.guild.name}`)
        .catch(() => {
          message.channel.send(
            `${message.member}, você foi verificado em ${message.guild.name}, porém não foi possível enviar uma mensagem privada. Verifique suas configurações de privacidade.`,
          );
        });
    } catch (error) {
      message.channel.send(
        "Não foi possível verificar você. Por favor, contate um administrador.",
      );
    }
  },
});

// Add aliases
commands.set("accept", commands.get("verify"));
commands.set("sv", commands.get("setverify"));
commands.set("sr", commands.get("setrole"));
commands.set("srr", commands.get("setrrole"));


// Reset commands
commands.set("rvchannel", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    db.delete(`verify_${message.guild.id}`);
    message.channel.send("O canal de verificação foi resetado");
  },
});

commands.set("rvrole", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    db.delete(`verole_${message.guild.id}`);
    message.channel.send("O cargo de verificação foi resetado");
  },
});

commands.set("rrvrole", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    db.delete(`srrole_${message.guild.id}`);
    message.channel.send("O cargo de random foi resetado");
  },
});

// Reset all verified members
commands.set("resetallverify", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }

    const verificationRoleId = db.get(`verole_${message.guild.id}`);
    if (!verificationRoleId) {
      return message.channel.send(
        "❌ Cargo de verificação não configurado. Use `.setrole @cargo` primeiro.",
      );
    }

    const verificationRole = message.guild.roles.cache.get(verificationRoleId);
    if (!verificationRole) {
      return message.channel.send(
        "❌ Cargo de verificação não encontrado. Verifique se ainda existe.",
      );
    }

    const statusMessage = await message.channel.send("⏳ Processando... Removendo cargo de verificação de todos os membros...");

    try {
      // Get all members with the verification role
      await message.guild.members.fetch();
      const membersWithRole = message.guild.members.cache.filter(member => 
        member.roles.cache.has(verificationRoleId)
      );

      if (membersWithRole.size === 0) {
        return statusMessage.edit("ℹ️ Nenhum membro possui o cargo de verificação.");
      }

      let successCount = 0;
      let errorCount = 0;

      // Remove role from all members
      for (const [memberId, member] of membersWithRole) {
        try {
          await member.roles.remove(verificationRole);
          successCount++;
        } catch (error) {
          console.error(`Erro ao remover cargo do membro ${member.user.tag}:`, error);
          errorCount++;
        }
      }

      const embed = new MessageEmbed()
        .setTitle("✅ Reset de Verificação Concluído")
        .setDescription(
          `**Resultados da operação:**
          
🎯 **Total de membros processados:** ${membersWithRole.size}
✅ **Cargos removidos com sucesso:** ${successCount}
❌ **Erros encontrados:** ${errorCount}

${errorCount > 0 ? '⚠️ Alguns erros podem ser devido a permissões ou membros que saíram do servidor.' : '🎉 Todos os cargos foram removidos com sucesso!'}`
        )
        .setColor(errorCount > 0 ? "#ff9900" : "#00ff00")
        .setTimestamp();

      await statusMessage.edit({ content: null, embeds: [embed] });

    } catch (error) {
      console.error("Erro durante reset de verificação:", error);
      await statusMessage.edit("❌ Erro durante o processo. Verifique as permissões do bot e tente novamente.");
    }
  },
});

// Welcome system configuration
commands.set("great", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "você não tem permissão para usar este comando.",
      );
    }

    const embed = new MessageEmbed()
      .setTitle("painel de Controle - sistema de boas-vindas")
      .setDescription(
        `**status das configurações:**
        
**canal de boas-vindas:**
> ${await getWelcomeChannelText(message.guild.id, client)}

**cargo automático:**
> ${await getWelcomeRoleText(message.guild.id, client)}

**auto-delete:**
> ${getWelcomeDeleteText(message.guild.id)}

**comandos de configuração:**
> \`${config.prefix}setwelcome #canal\` - Definir canal de boas-vindas
> \`${config.prefix}setwelcomerole @cargo\` - Definir cargo automático  
> \`${config.prefix}setautodelete 10\` - Auto-delete após X segundos (0 = desabilitado)
> \`${config.prefix}testwelcome\` - Testar sistema de boas-vindas
> \`${config.prefix}resetwelcome\` - Resetar todas as configurações

**💡 Dica:** Use os comandos acima para configurar seu sistema de boas-vindas personalizado!

**aliases Disponíveis:** \`sw\`, \`swr\`, \`sad\`, \`tw\`, \`rw\`
**para ver todos os comandos:** \`${config.prefix}help\`"`
      )
      .setColor("#000000")
      .setTimestamp()
      .setFooter("painel de Controle Interativo");

    message.channel.send({ embeds: [embed] });
  },
});

// Set welcome channel
commands.set("setwelcome", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "você não tem permissão para usar este comando.",
      );
    }
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.channel.send(
        "por favor, mencione o canal onde as mensagens de boas-vindas serão enviadas.",
      );
    }
    db.set(`welcome_channel_${message.guild.id}`, channel.id);
    message.channel.send(
      `Canal de boas-vindas definido para ${channel}`,
    );
  },
});

// Set welcome role
commands.set("setwelcomerole", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando, verme.",
      );
    }
    const role = message.mentions.roles.first();
    if (!role) {
      return message.channel.send(
        "Por favor, mencione o cargo que será dado automaticamente aos novos membros.",
      );
    }
    db.set(`welcome_role_${message.guild.id}`, role.id);
    message.channel.send(
      `Cargo automático definido para \`${role.name}\``,
    );
  },
});

// Set auto-delete time
commands.set("setautodelete", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0) {
      return message.channel.send(
        "Por favor, forneça um número válido de segundos (0 para desabilitar auto-delete).",
      );
    }
    if (seconds > 300) {
      return message.channel.send(
        "O tempo máximo para auto-delete é 300 segundos (5 minutos).",
      );
    }
    
    if (seconds === 0) {
      db.delete(`welcome_autodelete_${message.guild.id}`);
      message.channel.send("✅ Auto-delete desabilitado para mensagens de boas-vindas.");
    } else {
      db.set(`welcome_autodelete_${message.guild.id}`, seconds);
      message.channel.send(
        `✅ Auto-delete definido para ${seconds} segundos.`,
      );
    }
  },
});

// Reset welcome settings
commands.set("resetwelcome", {
  run: (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    db.delete(`welcome_channel_${message.guild.id}`);
    db.delete(`welcome_role_${message.guild.id}`);
    db.delete(`welcome_autodelete_${message.guild.id}`);
    message.channel.send("✅ Todas as configurações de boas-vindas foram resetadas.");
  },
});

// Test welcome message
commands.set("testwelcome", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send(
        "Você não tem permissão para usar este comando.",
      );
    }
    
    const welcomeChannelId = db.get(`welcome_channel_${message.guild.id}`);
    if (!welcomeChannelId) {
      return message.channel.send(
        "❌ Canal de boas-vindas não configurado. Use `.setwelcome #canal` primeiro.",
      );
    }
    
    const welcomeChannel = client.channels.cache.get(welcomeChannelId);
    if (!welcomeChannel) {
      return message.channel.send(
        "❌ Canal de boas-vindas não encontrado. Verifique se ainda existe.",
      );
    }
    
    await sendWelcomeMessage(client, message.member, true);
    message.channel.send("✅ Mensagem de teste enviada!");
  },
});

// Welcome command aliases (must be after all commands are defined)
commands.set("sw", commands.get("setwelcome"));
commands.set("swr", commands.get("setwelcomerole"));
commands.set("sad", commands.get("setautodelete"));
commands.set("tw", commands.get("testwelcome"));
commands.set("rw", commands.get("resetwelcome"));

// Reset verification alias
commands.set("rav", commands.get("resetallverify"));

// ===========================================
// ADMIN COMMANDS
// ===========================================

// Ban command (vaza)
commands.set("vaza", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("BAN_MEMBERS")) {
      return message.channel.send("Você não tem permissão para banir membros.");
    }

    const target = await resolveTarget(message, args, 'member');

    if (!target) {
      return message.channel.send("Por favor, mencione um usuário, responda a uma mensagem ou forneça um ID.");
    }

    if (!target.bannable) {
      return message.channel.send("Não posso banir este membro.");
    }

    const reason = args.slice(1).join(" ") || "Nenhum motivo fornecido";

    try {
      await target.send(`Você foi banido de ${message.guild.name}. Motivo: ${reason}`).catch(() => {});
      await target.ban({ reason: `${reason} - Por: ${message.author.tag}` });
      
      const embed = new MessageEmbed()
        .setTitle("✅ Membro Banido")
        .setDescription(`**Membro:** ${target.user.tag}\n**Motivo:** ${reason}\n**Moderador:** ${message.author.tag}`)
        .setColor("#000000")
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      message.channel.send("Erro ao banir o membro.");
    }
  },
});

// Kick command
commands.set("kick", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("KICK_MEMBERS")) {
      return message.channel.send("Você não tem permissão para expulsar membros.");
    }

    const target = await resolveTarget(message, args, 'member');

    if (!target) {
      return message.channel.send("Por favor, mencione um usuário, responda a uma mensagem ou forneça um ID.");
    }

    if (!target.kickable) {
      return message.channel.send("Não posso expulsar este membro.");
    }

    const reason = args.slice(1).join(" ") || "Nenhum motivo fornecido";

    try {
      await target.send(`Você foi expulso de ${message.guild.name}. Motivo: ${reason}`).catch(() => {});
      await target.kick(`${reason} - Por: ${message.author.tag}`);
      
      const embed = new MessageEmbed()
        .setTitle("✅ Membro Expulso")
        .setDescription(`**Membro:** ${target.user.tag}\n**Motivo:** ${reason}\n**Moderador:** ${message.author.tag}`)
        .setColor("#000000")
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      message.channel.send("Erro ao expulsar o membro.");
    }
  },
});

// Mute command
commands.set("mute", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("MODERATE_MEMBERS")) {
      return message.channel.send("Você não tem permissão para silenciar membros.");
    }

    const target = await resolveTarget(message, args, 'member');

    if (!target) {
      return message.channel.send("Por favor, mencione um usuário, responda a uma mensagem ou forneça um ID.");
    }

    if (!target.moderatable) {
      return message.channel.send("Não posso silenciar este membro.");
    }

    // Parse time (default 10 minutes)
    let timeArg = args.find(arg => /^\d+[mhd]$/.test(arg));
    let duration = 10 * 60 * 1000; // 10 minutes default
    
    if (timeArg) {
      const time = parseInt(timeArg);
      const unit = timeArg.slice(-1);
      
      switch(unit) {
        case 'm': duration = time * 60 * 1000; break;
        case 'h': duration = time * 60 * 60 * 1000; break;
        case 'd': duration = time * 24 * 60 * 60 * 1000; break;
      }
    }

    const reason = args.filter(arg => !arg.includes('<@') && !/^\d+[mhd]$/.test(arg)).join(" ") || "Nenhum motivo fornecido";

    try {
      await target.timeout(duration, `${reason} - Por: ${message.author.tag}`);
      
      const embed = new MessageEmbed()
        .setTitle("🔇 Membro Silenciado")
        .setDescription(`**Membro:** ${target.user.tag}\n**Duração:** ${timeArg || '10m'}\n**Motivo:** ${reason}\n**Moderador:** ${message.author.tag}`)
        .setColor("#000000")
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      message.channel.send("Erro ao silenciar o membro.");
    }
  },
});

// Unmute command
commands.set("unmute", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("MODERATE_MEMBERS")) {
      return message.channel.send("Você não tem permissão para remover silenciamento de membros.");
    }

    const target = await resolveTarget(message, args, 'member');

    if (!target) {
      return message.channel.send("Por favor, mencione um usuário, responda a uma mensagem ou forneça um ID.");
    }

    if (!target.moderatable) {
      return message.channel.send("Não posso remover o silenciamento deste membro.");
    }

    try {
      await target.timeout(null, `Silenciamento removido por: ${message.author.tag}`);
      
      const embed = new MessageEmbed()
        .setTitle("🔊 Silenciamento Removido")
        .setDescription(`**Membro:** ${target.user.tag}\n**Moderador:** ${message.author.tag}`)
        .setColor("#000000")
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      message.channel.send("Erro ao remover silenciamento do membro.");
    }
  },
});

// Unban command
commands.set("unban", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("BAN_MEMBERS")) {
      return message.channel.send("Você não tem permissão para desbanir membros.");
    }

    const userId = args[0];
    if (!userId) {
      return message.channel.send("Por favor, forneça o ID do usuário para desbanir.");
    }

    try {
      const bannedUsers = await message.guild.bans.fetch();
      const bannedUser = bannedUsers.get(userId);
      
      if (!bannedUser) {
        return message.channel.send("Este usuário não está banido ou o ID é inválido.");
      }

      await message.guild.members.unban(userId, `Desbanido por: ${message.author.tag}`);
      
      const embed = new MessageEmbed()
        .setTitle("✅ Membro Desbanido")
        .setDescription(`**Usuário:** ${bannedUser.user.tag}\n**Moderador:** ${message.author.tag}`)
        .setColor("#000000")
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      message.channel.send("Erro ao desbanir o usuário. Verifique se o ID está correto.");
    }
  },
});

// ===========================================
// UTIL COMMANDS
// ===========================================

// Avatar command (av)
commands.set("av", {
  run: async (client, message, args) => {
    const target = await resolveTarget(message, args, 'user') || message.author;

    const embed = new MessageEmbed()
      .setTitle(`Avatar de ${target.username}`)
      .setImage(target.displayAvatarURL({ dynamic: true, size: 4096 }))
      .setColor("#000000")
      .setTimestamp()
      .setFooter("created by lirolegal");

    message.channel.send({ embeds: [embed] });
  },
});

// UserInfo command with buttons
commands.set("userinfo", {
  run: async (client, message, args) => {
    const target = await resolveTarget(message, args, 'user') || message.author;

    const member = message.guild.members.cache.get(target.id);
    const joinedAt = member ? member.joinedAt : null;
    const createdAt = target.createdAt;

    // Calculate badges (basic implementation)
    const badges = [];
    if (target.bot) badges.push("🤖 Bot");
    if (member && member.permissions.has("ADMINISTRATOR")) badges.push("👑 Administrator");
    if (member && member.premiumSince) badges.push("💎 Nitro Booster");

    const embed = new MessageEmbed()
      .setTitle(`Informações de ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription([
        `**ID:** ${target.id}`,
        `**Tag:** ${target.tag}`,
        `**Criado em:** <t:${Math.floor(createdAt.getTime() / 1000)}:F>`,
        joinedAt ? `**Entrou em:** <t:${Math.floor(joinedAt.getTime() / 1000)}:F>` : "",
        member ? `**Cargo mais alto:** ${member.roles.highest}` : "",
        badges.length > 0 ? `**Badges:** ${badges.join(", ")}` : "",
      ].filter(Boolean).join("\n"))
      .setColor("#000000")
      .setTimestamp()
      .setFooter("created by lirolegal");

    // Note: Advanced button features for username/avatar history would require external APIs
    // For now, we'll show basic info with a note about limitations
    embed.addField("ℹ️ Nota", "Histórico de nomes e avatares requer APIs externas não disponíveis no momento.");

    message.channel.send({ embeds: [embed] });
  },
});

// Clear command
commands.set("clear", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("MANAGE_MESSAGES")) {
      return message.channel.send("Você não tem permissão para gerenciar mensagens.");
    }

    const amount = parseInt(args[0]);
    
    if (!amount || amount < 1 || amount > 100) {
      return message.channel.send("Por favor, forneça um número entre 1 e 100.");
    }

    try {
      const deleted = await message.channel.bulkDelete(amount + 1, true); // +1 to include the command message
      
      const embed = new MessageEmbed()
        .setTitle("🧹 Mensagens Limpas")
        .setDescription(`**${deleted.size - 1} mensagens** foram deletadas com sucesso.`)
        .setColor("#000000")
        .setTimestamp()
        .setFooter("created by lirolegal");

      const confirmMessage = await message.channel.send({ embeds: [embed] });
      
      // Auto-delete confirmation after 5 seconds
      setTimeout(() => {
        confirmMessage.delete().catch(() => {});
      }, 5000);
    } catch (error) {
      message.channel.send("Erro ao deletar mensagens. Verifique se as mensagens não são muito antigas (mais de 14 dias).");
    }
  },
});

// ===========================================
// ROLEPLAY COMMANDS
// ===========================================

// Anime GIF collections for roleplay commands
const animeGifs = {
  hug: [
    "https://media.tenor.com/Np-tCWJPtfwAAAAC/anime-hug.gif",
    "https://media.tenor.com/8NwUIH0sRvEAAAAC/cute-hug.gif",
    "https://media.tenor.com/Q5U5ZzMfkXEAAAAC/anime-kawaii.gif",
    "https://media.tenor.com/kxE5ey1hzJsAAAAC/anime-hug-kawaii.gif",
    "https://media.tenor.com/sP-agB_N2qYAAAAC/hug-anime.gif"
  ],
  kiss: [
    "https://media.tenor.com/2jQJmXJcxQEAAAAC/anime-kiss.gif",
    "https://media.tenor.com/GQO8A6EK1-MAAAAC/cute-kawaii.gif",
    "https://media.tenor.com/0cA5K7bxKksAAAAC/anime-kiss.gif",
    "https://media.tenor.com/TFpCsVZL9VwAAAAC/anime-kawaii.gif",
    "https://media.tenor.com/kxZSRb3nJfcAAAAC/kiss-anime.gif"
  ],
  kill: [
    "https://media.tenor.com/LzBMJy1gKwEAAAAC/anime-punch.gif",
    "https://media.tenor.com/8jTgPhAi9bwAAAAC/anime-slap.gif",
    "https://media.tenor.com/SIQjZ9sKCXUAAAAC/anime-fight.gif",
    "https://media.tenor.com/sI8eGQlhyqUAAAAC/anime-angry.gif",
    "https://media.tenor.com/wM7rrVHCwBgAAAAC/anime-punch.gif"
  ],
  pat: [
    "https://media.tenor.com/dL1Z3dHGZdwAAAAC/anime-pat.gif",
    "https://media.tenor.com/p4lCKpR6GBQAAAAC/pat-pat-head.gif",
    "https://media.tenor.com/Kn5tOFe_WHEAAAAC/anime-headpat.gif",
    "https://media.tenor.com/Mw88H-XaHdAAAAAC/pat-anime.gif",
    "https://media.tenor.com/GvG1_BhWPGEAAAAC/headpat-anime.gif"
  ],
  slap: [
    "https://media.tenor.com/QznDPeq-FAAAAAAC/anime-slap.gif",
    "https://media.tenor.com/aqRUDklCY2kAAAAC/anime-slap.gif",
    "https://media.tenor.com/YsGj2KUj4EEAAAAC/slap-anime.gif",
    "https://media.tenor.com/e6eP8MjNWxcAAAAC/anime-slap.gif",
    "https://media.tenor.com/A70bxG0LDGgAAAAC/slap-anime.gif"
  ]
};

// Hug command
commands.set("hug", {
  run: async (client, message, args) => {
    const target = await resolveTarget(message, args, 'user');

    if (!target) {
      return message.channel.send("Você precisa mencionar alguém ou responder a uma mensagem para abraçar!");
    }

    if (target.id === message.author.id) {
      return message.channel.send("Você não pode se abraçar... mas aqui está um abraço virtual! 🤗");
    }

    const randomGif = animeGifs.hug[Math.floor(Math.random() * animeGifs.hug.length)];

    const embed = new MessageEmbed()
      .setDescription(`**${message.author.username}** deu um abraço carinhoso em **${target.username}**! 🤗`)
      .setImage(randomGif)
      .setColor("#000000")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
});

// Kiss command
commands.set("kiss", {
  run: async (client, message, args) => {
    const target = await resolveTarget(message, args, 'user');

    if (!target) {
      return message.channel.send("Você precisa mencionar alguém ou responder a uma mensagem para beijar!");
    }

    if (target.id === message.author.id) {
      return message.channel.send("Você não pode se beijar... narcisista! 😏");
    }

    const randomGif = animeGifs.kiss[Math.floor(Math.random() * animeGifs.kiss.length)];

    const embed = new MessageEmbed()
      .setDescription(`**${message.author.username}** deu um beijo em **${target.username}**! 😘`)
      .setImage(randomGif)
      .setColor("#000000")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
});

// Kill command
commands.set("kill", {
  run: async (client, message, args) => {
    const target = await resolveTarget(message, args, 'user');

    if (!target) {
      return message.channel.send("Você precisa mencionar alguém ou responder a uma mensagem para eliminar!");
    }

    if (target.id === message.author.id) {
      return message.channel.send("Você não pode se eliminar... procure ajuda! 😅");
    }

    const randomGif = animeGifs.kill[Math.floor(Math.random() * animeGifs.kill.length)];

    const embed = new MessageEmbed()
      .setDescription(`**${message.author.username}** eliminou **${target.username}** dramaticamente! ⚔️`)
      .setImage(randomGif)
      .setColor("#000000")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
});

// Pat command
commands.set("pat", {
  run: async (client, message, args) => {
    const target = await resolveTarget(message, args, 'user');

    if (!target) {
      return message.channel.send("Você precisa mencionar alguém ou responder a uma mensagem para fazer carinho!");
    }

    if (target.id === message.author.id) {
      return message.channel.send("Fazendo carinho em si mesmo... que fofo! 🥺");
    }

    const randomGif = animeGifs.pat[Math.floor(Math.random() * animeGifs.pat.length)];

    const embed = new MessageEmbed()
      .setDescription(`**${message.author.username}** fez carinho na cabeça de **${target.username}**! 🥺`)
      .setImage(randomGif)
      .setColor("#000000")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
});

// Slap command
commands.set("slap", {
  run: async (client, message, args) => {
    const target = await resolveTarget(message, args, 'user');

    if (!target) {
      return message.channel.send("Você precisa mencionar alguém ou responder a uma mensagem para dar um tapa!");
    }

    if (target.id === message.author.id) {
      return message.channel.send("Por que você quer se bater? 😂");
    }

    const randomGif = animeGifs.slap[Math.floor(Math.random() * animeGifs.slap.length)];

    const embed = new MessageEmbed()
      .setDescription(`**${message.author.username}** deu um tapa em **${target.username}**! 👋`)
      .setImage(randomGif)
      .setColor("#000000")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
});

// ===========================================
// TINDER SYSTEM
// ===========================================

// Tinder setup command
commands.set("tinder", {
  run: async (client, message, args) => {
    const subcommand = args[0]?.toLowerCase();
    
    if (!subcommand) {
      const embed = new MessageEmbed()
        .setTitle("💕 Sistema Tinder")
        .setDescription([
          "**Comandos disponíveis:**",
          "",
          "`tinder perfil` - Ver seu perfil ou criar um novo",
          "`tinder setup` - Configurar seu perfil",
          "`tinder like @usuario` - Dar like em alguém",
          "`tinder browse` - Navegar pelos perfis",
          "`tinder matches` - Ver seus matches",
          "`tinder delete` - Deletar seu perfil"
        ].join("\n"))
        .setColor("#000000")
        .setTimestamp();
      
      return message.channel.send({ embeds: [embed] });
    }

    // Profile subcommand
    if (subcommand === "perfil") {
      const userId = message.author.id;
      const guildId = message.guild.id;
      const profileKey = `tinder_profile_${guildId}_${userId}`;
      const profile = db.get(profileKey);
      
      if (!profile) {
        const embed = new MessageEmbed()
          .setTitle("💔 Perfil não encontrado")
          .setDescription("Você ainda não tem um perfil! Use `tinder setup` para criar um.")
          .setColor("#000000")
          .setTimestamp();
        
        return message.channel.send({ embeds: [embed] });
      }
      
      // Get like count
      const likesKey = `tinder_likes_${guildId}_${userId}`;
      const likes = db.get(likesKey) || [];
      
      const embed = new MessageEmbed()
        .setTitle(`💕 Perfil de ${message.author.username}`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setDescription([
          `**Bio:** ${profile.bio}`,
          `**Idade:** ${profile.age} anos`,
          `**Interesses:** ${profile.interests}`,
          `**Likes recebidos:** ${likes.length}`
        ].join("\n"))
        .setColor("#000000")
        .setTimestamp();
      
      return message.channel.send({ embeds: [embed] });
    }

    // Setup subcommand
    if (subcommand === "setup") {
      const setupEmbed = new MessageEmbed()
        .setTitle("💕 Setup do Perfil Tinder")
        .setDescription([
          "Para configurar seu perfil, responda as próximas perguntas:",
          "",
          "**1.** Qual sua idade? (18-99)",
          "**2.** Escreva uma bio interessante (máx. 200 caracteres)",
          "**3.** Quais seus interesses? (separados por vírgula)"
        ].join("\n"))
        .setColor("#000000")
        .setTimestamp();
      
      message.channel.send({ embeds: [setupEmbed] });
      
      // Age collection
      const ageFilter = (m) => m.author.id === message.author.id && !isNaN(m.content) && parseInt(m.content) >= 18 && parseInt(m.content) <= 99;
      message.channel.send("**Qual sua idade?**");
      
      try {
        const ageMsg = await message.channel.awaitMessages({ filter: ageFilter, max: 1, time: 60000, errors: ['time'] });
        const age = parseInt(ageMsg.first().content);
        
        // Bio collection
        const bioFilter = (m) => m.author.id === message.author.id && m.content.length <= 200;
        message.channel.send("**Escreva sua bio (máx. 200 caracteres):**");
        
        const bioMsg = await message.channel.awaitMessages({ filter: bioFilter, max: 1, time: 60000, errors: ['time'] });
        const bio = bioMsg.first().content;
        
        // Interests collection
        const interestsFilter = (m) => m.author.id === message.author.id;
        message.channel.send("**Quais seus interesses? (separados por vírgula):**");
        
        const interestsMsg = await message.channel.awaitMessages({ filter: interestsFilter, max: 1, time: 60000, errors: ['time'] });
        const interests = interestsMsg.first().content;
        
        // Save profile
        const profile = { age, bio, interests, createdAt: Date.now() };
        const profileKey = `tinder_profile_${message.guild.id}_${message.author.id}`;
        db.set(profileKey, profile);
        
        const successEmbed = new MessageEmbed()
          .setTitle("✅ Perfil criado com sucesso!")
          .setDescription([
            `**Idade:** ${age} anos`,
            `**Bio:** ${bio}`,
            `**Interesses:** ${interests}`,
            "",
            "Agora você pode dar likes e receber matches! Use `tinder browse` para começar."
          ].join("\n"))
          .setColor("#000000")
          .setTimestamp();
        
        message.channel.send({ embeds: [successEmbed] });
        
      } catch (error) {
        message.channel.send("⏰ Tempo esgotado! Use `tinder setup` novamente para tentar.");
      }
      
      return;
    }

    // Like subcommand
    if (subcommand === "like") {
      const target = message.mentions.users.first();
      if (!target) {
        return message.channel.send("Você precisa mencionar alguém para dar like!");
      }
      
      if (target.id === message.author.id) {
        return message.channel.send("Você não pode dar like em si mesmo! 😅");
      }
      
      const userId = message.author.id;
      const targetId = target.id;
      const guildId = message.guild.id;
      
      // Check if both users have profiles
      const userProfile = db.get(`tinder_profile_${guildId}_${userId}`);
      const targetProfile = db.get(`tinder_profile_${guildId}_${targetId}`);
      
      if (!userProfile) {
        return message.channel.send("Você precisa criar um perfil primeiro! Use `tinder setup`.");
      }
      
      if (!targetProfile) {
        return message.channel.send("Esta pessoa não tem um perfil no Tinder ainda.");
      }
      
      // Check if already liked
      const targetLikesKey = `tinder_likes_${guildId}_${targetId}`;
      const targetLikes = db.get(targetLikesKey) || [];
      
      if (targetLikes.includes(userId)) {
        return message.channel.send("Você já deu like nesta pessoa!");
      }
      
      // Add like
      targetLikes.push(userId);
      db.set(targetLikesKey, targetLikes);
      
      // Check for match
      const userLikesKey = `tinder_likes_${guildId}_${userId}`;
      const userLikes = db.get(userLikesKey) || [];
      
      if (userLikes.includes(targetId)) {
        // It's a match!
        const userMatchesKey = `tinder_matches_${guildId}_${userId}`;
        const targetMatchesKey = `tinder_matches_${guildId}_${targetId}`;
        
        const userMatches = db.get(userMatchesKey) || [];
        const targetMatches = db.get(targetMatchesKey) || [];
        
        if (!userMatches.includes(targetId)) {
          userMatches.push(targetId);
          targetMatches.push(userId);
          
          db.set(userMatchesKey, userMatches);
          db.set(targetMatchesKey, targetMatches);
          
          // Send match notification
          const matchEmbed = new MessageEmbed()
            .setTitle("🎉 MATCH!")
            .setDescription(`Você e **${target.username}** deram match! 💕`)
            .setColor("#000000")
            .setTimestamp();
          
          message.channel.send({ embeds: [matchEmbed] });
          
          // Send DM to both users
          try {
            const dmEmbed = new MessageEmbed()
              .setTitle("💕 Novo Match!")
              .setDescription(`Você deu match com **${message.author.username}** no servidor **${message.guild.name}**!`)
              .setColor("#000000")
              .setTimestamp();
            
            target.send({ embeds: [dmEmbed] }).catch(() => {});
          } catch (error) {
            // DM failed, ignore
          }
        }
      } else {
        // Just a like
        const embed = new MessageEmbed()
          .setTitle("💕 Like enviado!")
          .setDescription(`Você deu like em **${target.username}**!`)
          .setColor("#000000")
          .setTimestamp();
        
        message.channel.send({ embeds: [embed] });
      }
      
      return;
    }

    // Browse subcommand
    if (subcommand === "browse") {
      const userId = message.author.id;
      const guildId = message.guild.id;
      
      // Check if user has profile
      const userProfile = db.get(`tinder_profile_${guildId}_${userId}`);
      if (!userProfile) {
        return message.channel.send("Você precisa criar um perfil primeiro! Use `tinder setup`.");
      }
      
      // Get all guild members with profiles
      const allKeys = Object.keys(db.get('') || {}).filter(key => 
        key.startsWith(`tinder_profile_${guildId}_`) && !key.endsWith(`_${userId}`)
      );
      
      if (allKeys.length === 0) {
        return message.channel.send("Nenhum outro perfil encontrado no servidor! 😢");
      }
      
      // Show random profile
      const randomKey = allKeys[Math.floor(Math.random() * allKeys.length)];
      const profileUserId = randomKey.split('_').pop();
      const profile = db.get(randomKey);
      
      try {
        const user = await client.users.fetch(profileUserId);
        
        const embed = new MessageEmbed()
          .setTitle(`💕 ${user.username}, ${profile.age} anos`)
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .setDescription([
            `**Bio:** ${profile.bio}`,
            `**Interesses:** ${profile.interests}`,
            "",
            `Use \`tinder like @${user.username}\` para dar like!`
          ].join("\n"))
          .setColor("#000000")
          .setTimestamp();
        
        message.channel.send({ embeds: [embed] });
      } catch (error) {
        message.channel.send("Erro ao carregar perfil. Tente novamente!");
      }
      
      return;
    }

    // Matches subcommand
    if (subcommand === "matches") {
      const userId = message.author.id;
      const guildId = message.guild.id;
      const matchesKey = `tinder_matches_${guildId}_${userId}`;
      const matches = db.get(matchesKey) || [];
      
      if (matches.length === 0) {
        const embed = new MessageEmbed()
          .setTitle("💔 Nenhum match ainda")
          .setDescription("Você ainda não tem matches. Continue dando likes!")
          .setColor("#000000")
          .setTimestamp();
        
        return message.channel.send({ embeds: [embed] });
      }
      
      let matchList = "**Seus matches:**\n\n";
      for (const matchId of matches) {
        try {
          const user = await client.users.fetch(matchId);
          matchList += `💕 ${user.username}\n`;
        } catch (error) {
          matchList += `💕 Usuário desconhecido\n`;
        }
      }
      
      const embed = new MessageEmbed()
        .setTitle("💕 Seus Matches")
        .setDescription(matchList)
        .setColor("#000000")
        .setTimestamp();
      
      message.channel.send({ embeds: [embed] });
      return;
    }

    // Delete subcommand
    if (subcommand === "delete") {
      const userId = message.author.id;
      const guildId = message.guild.id;
      
      db.delete(`tinder_profile_${guildId}_${userId}`);
      db.delete(`tinder_likes_${guildId}_${userId}`);
      db.delete(`tinder_matches_${guildId}_${userId}`);
      
      message.channel.send("🗑️ Seu perfil foi deletado com sucesso!");
      return;
    }
    
    message.channel.send("Subcommand inválido! Use apenas `tinder` para ver os comandos disponíveis.");
  },
});

// ===========================================
// CL (QUICK CLEAR) SYSTEM
// ===========================================

// CL setup and execution command
commands.set("cl", {
  run: async (client, message, args) => {
    // Check if this is a setup command
    if (args[0] === "setup") {
      if (!message.member.permissions.has("MANAGE_MESSAGES")) {
        return message.channel.send("Você não tem permissão para configurar o sistema CL.");
      }

      const guildId = message.guild.id;
      const clConfig = db.get(`cl_config_${guildId}`) || {
        enabled: false,
        trigger: ".cl",
        allowedRoles: [],
        allowedUsers: []
      };

      const embed = new MessageEmbed()
        .setTitle("⚙️ Configuração do Sistema CL")
        .setDescription([
          `**Status:** ${clConfig.enabled ? "✅ Ativado" : "❌ Desativado"}`,
          `**Comando gatilho:** \`${clConfig.trigger}\``,
          `**Cargos permitidos:** ${clConfig.allowedRoles.length > 0 ? clConfig.allowedRoles.map(id => `<@&${id}>`).join(", ") : "Nenhum"}`,
          `**Usuários permitidos:** ${clConfig.allowedUsers.length > 0 ? clConfig.allowedUsers.map(id => `<@${id}>`).join(", ") : "Nenhum"}`,
          "",
          "Use `.cl setup` para reconfigurar quando necessário."
        ].join("\n"))
        .setColor("#000000")
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }

    // Regular CL execution
    const guildId = message.guild.id;
    const clConfig = db.get(`cl_config_${guildId}`) || { enabled: false };

    if (!clConfig.enabled) {
      // If not enabled, use traditional clear command behavior
      if (!message.member.permissions.has("MANAGE_MESSAGES")) {
        return message.channel.send("Sistema CL não configurado. Use `.cl setup` para configurar.");
      }
    } else {
      // Check if user is allowed to use CL
      const hasRole = clConfig.allowedRoles.some(roleId => message.member.roles.cache.has(roleId));
      const isAllowedUser = clConfig.allowedUsers.includes(message.author.id);
      const hasPermission = message.member.permissions.has("MANAGE_MESSAGES");

      if (!hasRole && !isAllowedUser && !hasPermission) {
        return; // Silently ignore
      }

      // Check if message matches trigger
      if (clConfig.trigger && !message.content.startsWith(clConfig.trigger)) {
        return; // Wrong trigger
      }
    }

    // Delete 100 messages by default
    const amount = clConfig.enabled ? 100 : (parseInt(args[0]) || 100);
    
    if (amount > 100) {
      return message.channel.send("Máximo de 100 mensagens por vez.");
    }

    try {
      const deleted = await message.channel.bulkDelete(amount, true);
      
      if (clConfig.enabled) {
        // Auto-delete happens silently in CL mode
        return;
      } else {
        // Show confirmation in traditional mode
        const embed = new MessageEmbed()
          .setTitle("🧹 CL - Limpeza Rápida")
          .setDescription(`**${deleted.size} mensagens** foram deletadas automaticamente.`)
          .setColor("#000000")
          .setTimestamp();

        const confirmMessage = await message.channel.send({ embeds: [embed] });
        setTimeout(() => confirmMessage.delete().catch(() => {}), 3000);
      }
    } catch (error) {
      console.error("CL Error:", error);
    }
  },
});

// ===========================================
// MARRY SYSTEM
// ===========================================

// Marriage system command
commands.set("marry", {
  run: async (client, message, args) => {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const marriageKey = `marriage_${guildId}_${userId}`;
    const currentMarriage = db.get(marriageKey);

    // If user is already married, show marriage info
    if (currentMarriage && currentMarriage.partnerId) {
      try {
        const partner = await client.users.fetch(currentMarriage.partnerId);
        const marriageDate = new Date(currentMarriage.marriedAt);
        const duration = Date.now() - currentMarriage.marriedAt;
        
        // Calculate time difference
        const days = Math.floor(duration / (1000 * 60 * 60 * 24));
        const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        
        // Get marriage history
        const historyKey = `marriage_history_${guildId}_${userId}`;
        const history = db.get(historyKey) || [];
        
        const embed = new MessageEmbed()
          .setTitle("💍 Informações do Casamento")
          .setThumbnail(partner.displayAvatarURL({ dynamic: true }))
          .setDescription([
            `**Casado(a) com:** ${partner.username}`,
            `**Data do casamento:** <t:${Math.floor(marriageDate.getTime() / 1000)}:F>`,
            `**Tempo juntos:** ${days} dias, ${hours} horas e ${minutes} minutos`,
            `**Casamentos anteriores:** ${history.length}`
          ].join("\n"))
          .setColor("#000000")
          .setTimestamp();

        return message.channel.send({ embeds: [embed] });
      } catch (error) {
        // Partner not found, clear marriage
        db.delete(marriageKey);
      }
    }

    // Check if trying to marry someone
    const target = await resolveTarget(message, args, 'user');
    
    if (!target) {
      const embed = new MessageEmbed()
        .setTitle("💔 Solteiro(a)")
        .setDescription(`${message.author} tu não tem ninguém :rofl:`)
        .setColor("#000000")
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }

    if (target.id === message.author.id) {
      return message.channel.send("Você não pode casar consigo mesmo! 😅");
    }

    if (target.bot) {
      return message.channel.send("Você não pode casar com um bot! 🤖");
    }

    // Check if target is already married
    const targetMarriageKey = `marriage_${guildId}_${target.id}`;
    const targetMarriage = db.get(targetMarriageKey);
    
    if (targetMarriage && targetMarriage.partnerId) {
      return message.channel.send(`${target.username} já está casado(a)! 💔`);
    }

    // Create proposal
    const proposalKey = `marriage_proposal_${guildId}_${target.id}`;
    const existingProposal = db.get(proposalKey);
    
    if (existingProposal && existingProposal.proposerId === userId) {
      return message.channel.send("Você já fez uma proposta para esta pessoa! Aguarde a resposta.");
    }

    // Save proposal
    db.set(proposalKey, {
      proposerId: userId,
      proposerUsername: message.author.username,
      proposedAt: Date.now()
    });


    const embed = new MessageEmbed()
      .setTitle("💍 Pedido de Casamento!")
      .setDescription(`**${message.author.username}** está pedindo **${target.username}** em casamento! 💕\n\n${target}, você aceita?`)
      .setColor("#000000")
      .setTimestamp();

    const row = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId(`marry_accept_${userId}_${target.id}`)
          .setLabel("Aceitar 💍")
          .setStyle("SUCCESS"),
        new MessageButton()
          .setCustomId(`marry_reject_${userId}_${target.id}`)
          .setLabel("Recusar 💔")
          .setStyle("DANGER")
      );

    try {
      // Send DM to target
      const dmEmbed = new MessageEmbed()
        .setTitle("💍 Pedido de Casamento!")
        .setDescription(`**${message.author.username}** está te pedindo em casamento no servidor **${message.guild.name}**! 💕`)
        .setColor("#000000")
        .setTimestamp();

      await target.send({ embeds: [dmEmbed] });
    } catch (error) {
      // DM failed, continue with public message
    }

    message.channel.send({ content: `${target}`, embeds: [embed], components: [row] });
  },
});

// Divorce command
commands.set("divorce", {
  run: async (client, message, args) => {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const marriageKey = `marriage_${guildId}_${userId}`;
    const marriage = db.get(marriageKey);

    if (!marriage || !marriage.partnerId) {
      return message.channel.send("Você não está casado(a)!");
    }

    try {
      const partner = await client.users.fetch(marriage.partnerId);
      
      // Add to history
      const historyKey = `marriage_history_${guildId}_${userId}`;
      const partnerHistoryKey = `marriage_history_${guildId}_${marriage.partnerId}`;
      
      const userHistory = db.get(historyKey) || [];
      const partnerHistory = db.get(partnerHistoryKey) || [];
      
      const divorceRecord = {
        partnerId: marriage.partnerId,
        partnerUsername: partner.username,
        marriedAt: marriage.marriedAt,
        divorcedAt: Date.now(),
        duration: Date.now() - marriage.marriedAt
      };

      userHistory.push(divorceRecord);
      partnerHistory.push({
        partnerId: userId,
        partnerUsername: message.author.username,
        marriedAt: marriage.marriedAt,
        divorcedAt: Date.now(),
        duration: Date.now() - marriage.marriedAt
      });

      db.set(historyKey, userHistory);
      db.set(partnerHistoryKey, partnerHistory);

      // Delete marriages
      db.delete(marriageKey);
      db.delete(`marriage_${guildId}_${marriage.partnerId}`);

      const embed = new MessageEmbed()
        .setTitle("💔 Divórcio")
        .setDescription(`**${message.author.username}** e **${partner.username}** se divorciaram! 😢`)
        .setColor("#000000")
        .setTimestamp();

      message.channel.send({ embeds: [embed] });

      // Notify partner via DM
      try {
        const dmEmbed = new MessageEmbed()
          .setTitle("💔 Divórcio")
          .setDescription(`**${message.author.username}** pediu divórcio no servidor **${message.guild.name}**! 😢`)
          .setColor("#000000")
          .setTimestamp();

        await partner.send({ embeds: [dmEmbed] });
      } catch (error) {
        // DM failed, ignore
      }

    } catch (error) {
      db.delete(marriageKey);
      message.channel.send("💔 Casamento dissolvido (parceiro não encontrado).");
    }
  },
});

// ===========================================
// LOG SYSTEM
// ===========================================

// Log configuration command
commands.set("logs", {
  run: async (client, message, args) => {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.channel.send("Você não tem permissão para configurar logs.");
    }

    const subcommand = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    if (!subcommand) {
      const logConfig = db.get(`log_config_${guildId}`) || {};
      
      const embed = new MessageEmbed()
        .setTitle("📊 Sistema de Logs")
        .setDescription([
          "**Configurações atuais:**",
          "",
          `**📝 Mensagens:** ${logConfig.messageChannel ? `<#${logConfig.messageChannel}>` : "Não configurado"}`,
          `**👥 Membros:** ${logConfig.memberChannel ? `<#${logConfig.memberChannel}>` : "Não configurado"}`,
          `**⚙️ Servidor:** ${logConfig.serverChannel ? `<#${logConfig.serverChannel}>` : "Não configurado"}`,
          "",
          "**Comandos disponíveis:**",
          "`logs messages #canal` - Configurar logs de mensagens",
          "`logs members #canal` - Configurar logs de membros", 
          "`logs server #canal` - Configurar logs do servidor",
          "`logs disable <tipo>` - Desabilitar tipo de log",
          "`logs clear` - Limpar todas as configurações"
        ].join("\n"))
        .setColor("#000000")
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }

    if (subcommand === "messages") {
      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.channel.send("Por favor, mencione um canal para logs de mensagens.");
      }

      let config = db.get(`log_config_${guildId}`) || {};
      config.messageChannel = channel.id;
      db.set(`log_config_${guildId}`, config);

      message.channel.send(`✅ Logs de mensagens configurados para ${channel}`);
    } else if (subcommand === "members") {
      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.channel.send("Por favor, mencione um canal para logs de membros.");
      }

      let config = db.get(`log_config_${guildId}`) || {};
      config.memberChannel = channel.id;
      db.set(`log_config_${guildId}`, config);

      message.channel.send(`✅ Logs de membros configurados para ${channel}`);
    } else if (subcommand === "server") {
      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.channel.send("Por favor, mencione um canal para logs do servidor.");
      }

      let config = db.get(`log_config_${guildId}`) || {};
      config.serverChannel = channel.id;
      db.set(`log_config_${guildId}`, config);

      message.channel.send(`✅ Logs do servidor configurados para ${channel}`);
    } else if (subcommand === "disable") {
      const type = args[1]?.toLowerCase();
      if (!type || !["messages", "members", "server"].includes(type)) {
        return message.channel.send("Especifique o tipo: `messages`, `members` ou `server`");
      }

      let config = db.get(`log_config_${guildId}`) || {};
      delete config[`${type === "messages" ? "message" : type === "members" ? "member" : "server"}Channel`];
      db.set(`log_config_${guildId}`, config);

      message.channel.send(`✅ Logs de ${type} desabilitados.`);
    } else if (subcommand === "clear") {
      db.delete(`log_config_${guildId}`);
      message.channel.send("✅ Todas as configurações de log foram removidas.");
    }
  },
});

// Helper function to resolve target (user/member) from mentions, replies, or IDs
async function resolveTarget(message, args, type = 'user') {
  // Try mention first
  if (type === 'user') {
    const mentioned = message.mentions.users.first();
    if (mentioned) return mentioned;
  } else {
    const mentioned = message.mentions.members.first();
    if (mentioned) return mentioned;
  }
  
  // Try reply
  if (message.reference) {
    try {
      const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
      if (type === 'user') {
        return referencedMessage.author;
      } else {
        return message.guild.members.cache.get(referencedMessage.author.id);
      }
    } catch (error) {
      // Reply fetch failed, continue to ID
    }
  }
  
  // Try ID from arguments
  if (args[0]) {
    try {
      if (type === 'user') {
        return await message.client.users.fetch(args[0]);
      } else {
        return await message.guild.members.fetch(args[0]);
      }
    } catch (error) {
      // ID fetch failed
    }
  }
  
  return null;
}

// Helper functions
async function getWelcomeChannelText(guildId, client) {
  const channelId = db.get(`welcome_channel_${guildId}`);
  if (!channelId) return "Não configurado";
  const channel = client.channels.cache.get(channelId);
  return channel ? `${channel}` : "Canal não encontrado";
}

async function getWelcomeRoleText(guildId, client) {
  const roleId = db.get(`welcome_role_${guildId}`);
  if (!roleId) return "Não configurado";
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return "Servidor não encontrado";
  const role = guild.roles.cache.get(roleId);
  return role ? role.name : "Cargo não encontrado";
}

function getWelcomeDeleteText(guildId) {
  const seconds = db.get(`welcome_autodelete_${guildId}`);
  return seconds ? `${seconds} segundos` : "Desabilitado";
}

async function sendWelcomeMessage(client, member, isTest = false) {
  const guildId = member.guild.id;
  const welcomeChannelId = db.get(`welcome_channel_${guildId}`);
  
  if (!welcomeChannelId) return;
  
  const welcomeChannel = client.channels.cache.get(welcomeChannelId);
  if (!welcomeChannel) return;
  
  const embed = new MessageEmbed()
    .setTitle("🎉 Bem-vindo(a)!")
    .setDescription(
      `Olá ${member}! Seja muito bem-vindo(a) ao **${member.guild.name}**!
      
Esperamos que você se divirta aqui! 🎊`
    )
    .setColor("#00ff00")
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp()
    .setFooter(isTest ? "Esta é uma mensagem de teste" : `Membro #${member.guild.memberCount}`);

  try {
    const welcomeMsg = await welcomeChannel.send({ embeds: [embed] });
    
    // Auto-delete if configured
    const autoDeleteSeconds = db.get(`welcome_autodelete_${guildId}`);
    if (autoDeleteSeconds && autoDeleteSeconds > 0) {
      setTimeout(() => {
        welcomeMsg.delete().catch(() => {});
      }, autoDeleteSeconds * 1000);
    }
    
    // Add welcome role if configured
    const welcomeRoleId = db.get(`welcome_role_${guildId}`);
    if (welcomeRoleId && !isTest) {
      const welcomeRole = member.guild.roles.cache.get(welcomeRoleId);
      if (welcomeRole) {
        await member.roles.add(welcomeRole).catch(() => {});
      }
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem de boas-vindas:", error);
  }
}

// ===========================================
// LOG SYSTEM EVENT HANDLERS
// ===========================================

// Message update (edit) logging
client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  const logConfig = db.get(`log_config_${newMessage.guild.id}`);
  if (!logConfig?.messageChannel) return;

  const logChannel = newMessage.guild.channels.cache.get(logConfig.messageChannel);
  if (!logChannel) return;

  const embed = new MessageEmbed()
    .setTitle("📝 Mensagem Editada")
    .setDescription([
      `**Usuário:** ${newMessage.author}`,
      `**Canal:** ${newMessage.channel}`,
      `**Antes:** ${oldMessage.content || "*Conteúdo não disponível*"}`,
      `**Depois:** ${newMessage.content}`,
      `**[Link da mensagem](${newMessage.url})**`
    ].join("\n"))
    .setColor("#FFA500")
    .setTimestamp()
    .setFooter(`ID: ${newMessage.author.id}`);

  logChannel.send({ embeds: [embed] }).catch(() => {});
});

// Message delete logging
client.on("messageDelete", async (message) => {
  if (message.author?.bot) return;

  const logConfig = db.get(`log_config_${message.guild.id}`);
  if (!logConfig?.messageChannel) return;

  const logChannel = message.guild.channels.cache.get(logConfig.messageChannel);
  if (!logChannel) return;

  const embed = new MessageEmbed()
    .setTitle("🗑️ Mensagem Deletada")
    .setDescription([
      `**Usuário:** ${message.author}`,
      `**Canal:** ${message.channel}`,
      `**Conteúdo:** ${message.content || "*Sem conteúdo de texto*"}`,
      message.attachments.size > 0 ? `**Anexos:** ${message.attachments.size}` : ""
    ].filter(Boolean).join("\n"))
    .setColor("#FF0000")
    .setTimestamp()
    .setFooter(`ID: ${message.author.id}`);

  logChannel.send({ embeds: [embed] }).catch(() => {});
});

// Member update (nickname/avatar) logging
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const logConfig = db.get(`log_config_${newMember.guild.id}`);
  if (!logConfig?.memberChannel) return;

  const logChannel = newMember.guild.channels.cache.get(logConfig.memberChannel);
  if (!logChannel) return;

  const changes = [];
  
  // Nickname change
  if (oldMember.nickname !== newMember.nickname) {
    changes.push(`**Apelido:** ${oldMember.nickname || "*Nenhum*"} → ${newMember.nickname || "*Nenhum*"}`);
  }

  // Avatar change (user update, not member specific)
  if (changes.length === 0) return;

  const embed = new MessageEmbed()
    .setTitle("👤 Membro Atualizado")
    .setDescription([
      `**Usuário:** ${newMember.user}`,
      ...changes
    ].join("\n"))
    .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
    .setColor("#00FF00")
    .setTimestamp()
    .setFooter(`ID: ${newMember.user.id}`);

  logChannel.send({ embeds: [embed] }).catch(() => {});
});

// User update (avatar) logging
client.on("userUpdate", async (oldUser, newUser) => {
  // Check all guilds the bot shares with this user
  for (const guild of client.guilds.cache.values()) {
    if (!guild.members.cache.has(newUser.id)) continue;

    const logConfig = db.get(`log_config_${guild.id}`);
    if (!logConfig?.memberChannel) continue;

    const logChannel = guild.channels.cache.get(logConfig.memberChannel);
    if (!logChannel) continue;

    const changes = [];
    
    // Avatar change
    if (oldUser.avatar !== newUser.avatar) {
      changes.push(`**Avatar alterado**`);
    }

    // Username change
    if (oldUser.username !== newUser.username) {
      changes.push(`**Nome:** ${oldUser.username} → ${newUser.username}`);
    }

    if (changes.length === 0) continue;

    const embed = new MessageEmbed()
      .setTitle("👤 Usuário Atualizado")
      .setDescription([
        `**Usuário:** ${newUser}`,
        ...changes
      ].join("\n"))
      .setThumbnail(newUser.displayAvatarURL({ dynamic: true }))
      .setColor("#00FF00")
      .setTimestamp()
      .setFooter(`ID: ${newUser.id}`);

    logChannel.send({ embeds: [embed] }).catch(() => {});
  }
});

// Channel create logging
client.on("channelCreate", async (channel) => {
  if (!channel.guild) return;

  const logConfig = db.get(`log_config_${channel.guild.id}`);
  if (!logConfig?.serverChannel) return;

  const logChannel = channel.guild.channels.cache.get(logConfig.serverChannel);
  if (!logChannel) return;

  const embed = new MessageEmbed()
    .setTitle("📁 Canal Criado")
    .setDescription([
      `**Canal:** ${channel}`,
      `**Tipo:** ${channel.type}`,
      `**Categoria:** ${channel.parent?.name || "Nenhuma"}`
    ].join("\n"))
    .setColor("#00FF00")
    .setTimestamp()
    .setFooter(`ID: ${channel.id}`);

  logChannel.send({ embeds: [embed] }).catch(() => {});
});

// Channel delete logging
client.on("channelDelete", async (channel) => {
  if (!channel.guild) return;

  const logConfig = db.get(`log_config_${channel.guild.id}`);
  if (!logConfig?.serverChannel) return;

  const logChannel = channel.guild.channels.cache.get(logConfig.serverChannel);
  if (!logChannel || logChannel.id === channel.id) return;

  const embed = new MessageEmbed()
    .setTitle("🗑️ Canal Deletado")
    .setDescription([
      `**Nome:** ${channel.name}`,
      `**Tipo:** ${channel.type}`,
      `**Categoria:** ${channel.parent?.name || "Nenhuma"}`
    ].join("\n"))
    .setColor("#FF0000")
    .setTimestamp()
    .setFooter(`ID: ${channel.id}`);

  logChannel.send({ embeds: [embed] }).catch(() => {});
});

// Role create/delete logging
client.on("roleCreate", async (role) => {
  const logConfig = db.get(`log_config_${role.guild.id}`);
  if (!logConfig?.serverChannel) return;

  const logChannel = role.guild.channels.cache.get(logConfig.serverChannel);
  if (!logChannel) return;

  const embed = new MessageEmbed()
    .setTitle("🏷️ Cargo Criado")
    .setDescription([
      `**Nome:** ${role.name}`,
      `**Cor:** ${role.hexColor}`,
      `**Mencionável:** ${role.mentionable ? "Sim" : "Não"}`
    ].join("\n"))
    .setColor("#00FF00")
    .setTimestamp()
    .setFooter(`ID: ${role.id}`);

  logChannel.send({ embeds: [embed] }).catch(() => {});
});

client.on("roleDelete", async (role) => {
  const logConfig = db.get(`log_config_${role.guild.id}`);
  if (!logConfig?.serverChannel) return;

  const logChannel = role.guild.channels.cache.get(logConfig.serverChannel);
  if (!logChannel) return;

  const embed = new MessageEmbed()
    .setTitle("🗑️ Cargo Deletado")
    .setDescription([
      `**Nome:** ${role.name}`,
      `**Cor:** ${role.hexColor}`,
      `**Membros:** ${role.members.size}`
    ].join("\n"))
    .setColor("#FF0000")
    .setTimestamp()
    .setFooter(`ID: ${role.id}`);

  logChannel.send({ embeds: [embed] }).catch(() => {});
});

// Invite create logging
client.on("inviteCreate", async (invite) => {
  const logConfig = db.get(`log_config_${invite.guild.id}`);
  if (!logConfig?.serverChannel) return;

  const logChannel = invite.guild.channels.cache.get(logConfig.serverChannel);
  if (!logChannel) return;

  const embed = new MessageEmbed()
    .setTitle("🔗 Convite Criado")
    .setDescription([
      `**Criado por:** ${invite.inviter}`,
      `**Canal:** ${invite.channel}`,
      `**Código:** ${invite.code}`,
      `**Usos máximos:** ${invite.maxUses || "Ilimitado"}`,
      `**Expira em:** ${invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : "Nunca"}`
    ].join("\n"))
    .setColor("#0099FF")
    .setTimestamp()
    .setFooter(`Código: ${invite.code}`);

  logChannel.send({ embeds: [embed] }).catch(() => {});
});

// ===========================================
// MESSAGE HANDLER
// ===========================================

// Message handler
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // Auto-delete in verification channel
  const channel = db.get(`verify_${message.guild.id}`);
  if (channel && message.channel.id === channel) {
    if (!message.content.startsWith(config.prefix)) {
      message.delete().catch(() => {});
      return;
    }
  }

  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const cmd = args.shift().toLowerCase();

  if (cmd.length === 0) return;

  const command = commands.get(cmd);
  if (command) {
    try {
      command.run(client, message, args);
    } catch (error) {
      console.error("Command error:", error);
      message.channel.send("Ocorreu um erro ao executar o comando.");
    }
  }
});

// Guild member add event (welcome system)
client.on("guildMemberAdd", async (member) => {
  await sendWelcomeMessage(client, member);
});

// Interaction handler for buttons
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;

  // Handle marriage proposal buttons
  if (customId.startsWith("marry_accept_") || customId.startsWith("marry_reject_")) {
    const [action, , proposerId, targetId] = customId.split("_");
    
    if (interaction.user.id !== targetId) {
      return interaction.reply({ content: "Esta proposta não é para você!", ephemeral: true });
    }

    const guildId = interaction.guild.id;
    const proposalKey = `marriage_proposal_${guildId}_${targetId}`;
    const proposal = db.get(proposalKey);

    if (!proposal || proposal.proposerId !== proposerId) {
      return interaction.reply({ content: "Proposta não encontrada ou expirada!", ephemeral: true });
    }

    if (action === "accept") {
      // Create marriage
      const marriageData = {
        partnerId: proposerId,
        marriedAt: Date.now()
      };

      db.set(`marriage_${guildId}_${proposerId}`, { partnerId: targetId, marriedAt: Date.now() });
      db.set(`marriage_${guildId}_${targetId}`, marriageData);
      db.delete(proposalKey);

      const embed = new MessageEmbed()
        .setTitle("🎉 Casamento Realizado!")
        .setDescription(`**${proposal.proposerUsername}** e **${interaction.user.username}** agora estão casados! 💍💕`)
        .setColor("#000000")
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [] });

      // Send DM notifications
      try {
        const proposer = await client.users.fetch(proposerId);
        const dmEmbed = new MessageEmbed()
          .setTitle("🎉 Casamento Aceito!")
          .setDescription(`**${interaction.user.username}** aceitou seu pedido de casamento no servidor **${interaction.guild.name}**! 💍`)
          .setColor("#000000")
          .setTimestamp();

        await proposer.send({ embeds: [dmEmbed] });
      } catch (error) {
        // DM failed, ignore
      }

    } else if (action === "reject") {
      db.delete(proposalKey);

      const embed = new MessageEmbed()
        .setTitle("💔 Proposta Rejeitada")
        .setDescription(`**${interaction.user.username}** rejeitou a proposta de **${proposal.proposerUsername}**.`)
        .setColor("#000000")
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [] });

      // Send DM notification
      try {
        const proposer = await client.users.fetch(proposerId);
        const dmEmbed = new MessageEmbed()
          .setTitle("💔 Proposta Rejeitada")
          .setDescription(`**${interaction.user.username}** rejeitou seu pedido de casamento no servidor **${interaction.guild.name}**.`)
          .setColor("#000000")
          .setTimestamp();

        await proposer.send({ embeds: [dmEmbed] });
      } catch (error) {
        // DM failed, ignore
      }
    }
  }

  // Handle CL configuration buttons
  if (customId.startsWith("cl_")) {
    if (!interaction.member.permissions.has("MANAGE_MESSAGES")) {
      return interaction.reply({ content: "Você não tem permissão para configurar o CL!", ephemeral: true });
    }

    const guildId = interaction.guild.id;
    const clConfig = db.get(`cl_config_${guildId}`) || {
      enabled: false,
      trigger: ".cl",
      allowedRoles: [],
      allowedUsers: []
    };

    if (customId === "cl_toggle") {
      clConfig.enabled = !clConfig.enabled;
      db.set(`cl_config_${guildId}`, clConfig);

      const embed = new MessageEmbed()
        .setTitle("⚙️ CL Status Atualizado")
        .setDescription(`Sistema CL foi **${clConfig.enabled ? "ativado" : "desativado"}** com sucesso!`)
        .setColor("#000000")
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.reply({ content: "Configuração manual necessária. Use comandos de texto para configurar cargos, usuários e gatilho.", ephemeral: true });
    }
  }
});

// Ready event
client.on("ready", () => {
  client.user.setStatus("dnd");
  console.log(`To logado em ${client.user.tag}`);
  console.log(`Loaded ${commands.size} commands`);
});

// Error handling
client.on("error", console.error);
process.on("unhandledRejection", console.error);

// Keep alive server
require("http")
  .createServer((req, res) =>
    res.end(`
 |-----------------------------------------|
 |              Informations               |
 |-----------------------------------------|
 |• Alive: 24/7                            |
 |-----------------------------------------|
 |• Author: lirolegal                      |
 |-----------------------------------------|
 |• Server: https://discord.gg/sintase     |
 |-----------------------------------------|
 |• Github: https://github.com/liroburro   |
 |-----------------------------------------|
 |• License: Apache License 2.0            |
 |-----------------------------------------|
`),
  )
  .listen(process.env.PORT || 5000);

// Login
client.login(process.env.TOKEN);





