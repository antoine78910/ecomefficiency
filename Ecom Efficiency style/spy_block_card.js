// Sélectionner tous les éléments ayant la classe "product-card"
const productCards = document.querySelectorAll('.product-card');

// Afficher dans la console le nombre de cartes trouvées
console.log(`Nombre de cartes trouvées : ${productCards.length}`);

// Parcourir chaque élément "product-card" et les masquer
productCards.forEach(card => {
  card.style.display = 'none';
});

