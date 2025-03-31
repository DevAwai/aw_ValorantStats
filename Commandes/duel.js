const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { handleError } = require("../utils/errorHandler");
const { getUserBalance, updateUserBalance, createUserIfNotExists } = require("../utils/creditsManager");

module.exports = {
    name: "duel",
    description: "Lance un morpion contre un autre joueur",
    cooldown: 2000,
    options: [
        {
            type: "user",
            name: "adversaire",
            description: "Mentionnez l'utilisateur contre qui vous voulez jouer",
            required: true,
        },
    ],
    async execute(interaction) {
        const joueur1 = interaction.user;
        const joueur2 = interaction.options.getUser("adversaire");

        if (joueur1.id === joueur2.id) {
            return interaction.reply({
                content: "❌ Vous ne pouvez pas jouer contre vous-même !",
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
                .setFooter({ text: `Tour de ${tour.username} (${symbole})` });
        };

        const genererBoutons = () => {
            const rows = [];
            for (let i = 0; i < 3; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`${i}-${j}`)
                            .setLabel(grille[i][j] ? grille[i][j] : "⬜")
                            .setStyle(grille[i][j] ? ButtonStyle.Primary : ButtonStyle.Secondary)
                            .setDisabled(grille[i][j] !== null)
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
            if (grille[0][0] === symbole && grille[1][1] === symbole && grille[2][2] === symbole) return true;
            if (grille[0][2] === symbole && grille[1][1] === symbole && grille[2][0] === symbole) return true;
            return false;
        };

        const verifierEgalite = () => {
            return grille.flat().every(cell => cell !== null);
        };

        const mettreAJourJeu = async () => {
            try {
                if (messageJeu && messageJeu.deletable) {
                    await messageJeu.delete();
                }
                messageJeu = await interaction.channel.send({
                    embeds: [genererEmbed("Cliquez sur une case pour jouer !")],
                    components: genererBoutons(),
                });
            } catch (error) {
                console.error("Erreur lors de la suppression du message : ", error);
            }
        };
        

        await mettreAJourJeu();

        const collector = interaction.channel.createMessageComponentCollector({
            filter: (buttonInteraction) => buttonInteraction.user.id === tour.id,
            time: 60000,
        });

        collector.on("collect", async (buttonInteraction) => {
            const [ligne, colonne] = buttonInteraction.customId.split("-").map(Number);

            if (grille[ligne][colonne] !== null) {
                return buttonInteraction.reply({
                    content: "❌ Cette case est déjà occupée !",
                    ephemeral: true,
                });
            }

            grille[ligne][colonne] = symbole;

            if (verifierVictoire(symbole)) {
                collector.stop();
                updateUserBalance(tour.id, 1000);

                const nouveauSolde = getUserBalance(tour.id);
                await mettreAJourJeu();
                return interaction.channel.send({
                    embeds: [
                        genererEmbed(`🎉 ${tour} a gagné et remporte **1000 VCOINS** !\n💰 Nouveau solde : **${nouveauSolde} VCOINS**`)
                    ]
                });
            }

            if (verifierEgalite()) {
                collector.stop();
                await mettreAJourJeu();
                return interaction.channel.send({
                    embeds: [genererEmbed("🤝 Match nul ! Personne ne gagne.")]
                });
            }

            tour = tour.id === joueur1.id ? joueur2 : joueur1;
            symbole = symbole === "❌" ? "⭕" : "❌";

            await buttonInteraction.deferUpdate();
            await mettreAJourJeu();
        });

        collector.on("end", (_, reason) => {
            if (reason === "time") {
                interaction.channel.send({
                    embeds: [genererEmbed("⏰ Temps écoulé, la partie est annulée.")]
                });
            }
        });
    },
};
