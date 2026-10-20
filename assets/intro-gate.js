// Runs before the page paints: shows the bloom quiz on someone's first visit only.
// ?quiz opens it again; ?noquiz or any #link skips it. Without JS there is no quiz.
(function () {
  try {
    var q = new URLSearchParams(location.search);
    var seen = localStorage.getItem('ca-intro');
    if (q.has('quiz') || (!seen && !location.hash && !q.has('noquiz'))) {
      document.documentElement.classList.add('show-intro');
    }
  } catch (e) { /* storage blocked: skip the quiz */ }
})();
