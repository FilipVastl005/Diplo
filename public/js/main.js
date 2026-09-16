// Auto-dismiss alerts after 5 seconds
document.querySelectorAll('.alert').forEach(function(el) {
  setTimeout(function() {
    el.style.transition = 'opacity .5s';
    el.style.opacity = '0';
    setTimeout(function() { el.remove(); }, 500);
  }, 5000);
});
