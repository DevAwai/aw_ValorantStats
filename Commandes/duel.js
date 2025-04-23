const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { handleError } = require("../utils/errorHandler");
const { getUserBalance, updateUserBalance, createUserIfNotExists } = require("../utils/creditsManager");
const { checkCooldown } = require("../utils/cooldownManager");

module.exports = {
    name: "duel",
    description: "Lance un morpion contre un autre joueur",
    cooldown: 2000,
    utilisation: "/duel",
    options: [
        {
            type: "user",
            name: "adversaire",
            description: "Mentionnez l'utilisateur contre qui vous voulez jouer",
            required: true,
        },
    ],
    async execute(interaction) {
        try {
            const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
            if (cooldownResult !== true) {
                return interaction.reply({ content: cooldownResult, ephemeral: true });
            }

            const joueur1 = interaction.user;
            const joueur2 = interaction.options.getUser("adversaire");

            if (joueur1.id === joueur2.id) {
                return interaction.reply({
                    content: "❌ Vous ne pouvez pas jouer contre vous-même !",
                    ephemeral: true,
                });
            }

            if (joueur2.bot) {
                return interaction.reply({
                    content: "❌ Vous ne pouvez pas jouer contre un bot !",
                    ephemeral: true,
                });
            }

            createUserIfNotExists(joueur1.id);
            createUserIfNotExists(joueur2.id);

            const grille = Array(3).fill().map(() => Array(3).fill(null));
            let tour = joueur1;
            let symbole = "❌";
            let messageJeu;

            const genererEmbed = (message) => {
                return new EmbedBuilder()
                    .setTitle("🎮 Morpion - Duel")
                    .setDescription(message)
                    .setColor("#2b2d31")
                    .addFields(
                        { name: "Joueur 1", value: `${joueur1} (❌)`, inline: true },
                        { name: "Joueur 2", value: `${joueur2} (⭕)`, inline: true }
                    )
                    .setFooter({ text: `Tour de ${tour.username}` });
            };

            const genererBoutons = () => {
                const rows = [];
                for (let i = 0; i < 3; i++) {
                    const row = new ActionRowBuilder();
                    for (let j = 0; j < 3; j++) {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`${i}-${j}`)
                                .setLabel(grille[i][j] || "⬜")
                                .setStyle(grille[i][j] ? ButtonStyle.Primary : ButtonStyle.Secondary)
                                .setDisabled(!!grille[i][j])
                        );
                    }
                    rows.push(row);
                }
                return rows;
            };

            const verifierVictoire = (symbole) => {
                for (let i = 0; i < 3; i++) {
                    if (grille[i][0] === symbole && grille[i][1] === symbole && grille[i][2] === symbole) return true;
                    if (grille[0][i] === symbole && grille[1][i] === symbole && grille[2][i] === symbole) return true;
                }
                return (grille[0][0] === symbole && grille[1][1] === symbole && grille[2][2] === symbole) ||
                       (grille[0][2] === symbole && grille[1][1] === symbole && grille[2][0] === symbole);
            };

            const verifierEgalite = () => grille.flat().every(cell => cell);

            await interaction.reply({ content: "🎮 Partie de morpion créée !", ephemeral: true });
            messageJeu = await interaction.channel.send({
                embeds: [genererEmbed("Cliquez sur une case pour jouer !")],
                components: genererBoutons(),
            });

            const collector = messageJeu.createMessageComponentCollector({
                filter: i => [joueur1.id, joueur2.id].includes(i.user.id),
                time: 300000
            });

            collector.on("collect", async (buttonInteraction) => {
                if (buttonInteraction.user.id !== tour.id) {
                    return buttonInteraction.reply({
                        content: "⏳ Ce n'est pas votre tour !",
                        ephemeral: true
                    });
                }

                const [ligne, colonne] = buttonInteraction.customId.split("-").map(Number);
                grille[ligne][colonne] = symbole;

                if (verifierVictoire(symbole)) {
                    collector.stop();
                    updateUserBalance(tour.id, 1000);
                    await buttonInteraction.update({
                        embeds: [genererEmbed(`🎉 ${tour} a gagné et remporte **1000 VCOINS** !`)],
                        components: genererBoutons()
                    });
                    return;
                }

                if (verifierEgalite()) {
                    collector.stop();
                    await buttonInteraction.update({
                        embeds: [genererEmbed("🤝 Match nul ! Personne ne gagne.")],
                        components: genererBoutons()
                    });
                    return;
                }

                tour = tour.id === joueur1.id ? joueur2 : joueur1;
                symbole = symbole === "❌" ? "⭕" : "❌";

                await buttonInteraction.update({
                    embeds: [genererEmbed("Cliquez sur une case pour jouer !")],
                    components: genererBoutons()
                });
            });

            collector.on("end", () => {
                messageJeu.edit({
                    components: genererBoutons().map(row => 
                        new ActionRowBuilder().addComponents(
                            row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
                        )
                    )
                });
            });

        } catch (error) {
            await handleError(interaction, error, "API");
        }
    }
};