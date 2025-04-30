
  
  // Card clicks: navigate to the module page
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const target = card.getAttribute("data-link");
      window.location.href = target;
    });
  });

  document.getElementById("backBtn").addEventListener("click", () => {
    document.getElementById("menu").style.display  = "none";
    document.getElementById("intro").style.display = "block";
  });