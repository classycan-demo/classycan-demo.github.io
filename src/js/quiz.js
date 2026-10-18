/**
 * CLASSyCAN Quiz & Interactive Exercise Engine
 * Handles Jyutping verification, measure words matching, and score tracking.
 */

window.CLASSYCAN_QUIZ = (function() {
  function normalizeJyutping(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\s+/g, '').trim();
  }

  function checkJyutpingInput(userInput, correctAnswer) {
    const cleanUser = normalizeJyutping(userInput);
    const cleanCorrect = normalizeJyutping(correctAnswer);
    return cleanUser === cleanCorrect;
  }

  return {
    normalizeJyutping,
    checkJyutpingInput
  };
})();
