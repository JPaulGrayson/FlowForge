/**
 * Generates mock weather data for Dallas, TX
 * @returns {Object} Weather data object
 * @property {string} city - The city name (always 'Dallas')
 * @property {number} temp - Temperature in Fahrenheit (30-60°F range)
 * @property {string} condition - Weather condition ('sunny', 'cloudy', or 'rainy')
 * @throws {Error} If random number generation fails
 */
function getDallasWeatherMock() {
  try {
    const conditions = ['sunny', 'cloudy', 'rainy'];
    const temp = Math.floor(Math.random() * 31) + 30;
    const conditionIndex = Math.floor(Math.random() * conditions.length);
    
    return {
      city: 'Dallas',
      temp: temp,
      condition: conditions[conditionIndex]
    };
  } catch (error) {
    throw new Error(`Failed to generate weather data: ${error.message}`);
  }
}

console.log('=== Dallas Weather Mock Test ===');
console.log('Running 3 sample calls:\n');

for (let i = 1; i <= 3; i++) {
  const weather = getDallasWeatherMock();
  console.log(`Call ${i}:`, JSON.stringify(weather, null, 2));
}

console.log('\n=== Test Complete ===');

export { getDallasWeatherMock };
