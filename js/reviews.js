/* reviews.js – homepage reviews marquee */
function renderHomepageReviews(products) {
  const track = document.getElementById('homepage-reviews-track');
  if (!track) return;
  let reviews = [];
  products.forEach(p => {
    (p.reviews || []).forEach(r => reviews.push({ ...r, productName: p.name }));
  });
  // Duplicate for seamless marquee
  const all = [...reviews, ...reviews];
  track.innerHTML = all.map(r => `
  <div class="review-marquee-card">
    <div class="rmc-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
    <p class="rmc-comment">"${r.comment}"</p>
    <div class="rmc-user">${r.user}</div>
    <div class="rmc-product">on ${r.productName}</div>
  </div>`).join('');
}
