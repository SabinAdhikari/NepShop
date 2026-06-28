let cartCount = 0;

const cartNumber = document.querySelector(".cartNumber");
const bagButtons = document.querySelectorAll(".Bag");

function increaseCart() {
  cartCount += 1;
  cartNumber.textContent = cartCount;
}

bagButtons.forEach((button) => {
  button.addEventListener("click", increaseCart);
});
