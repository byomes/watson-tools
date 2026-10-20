// Why each wrong choice is wrong, Math. W(question, correct choice text, { wrong choice text: reason }).
// ---- m3: ratios, rates, proportions & unit conversion ----
W("A recipe uses 2 cups flour for every 3 cups sugar. How much sugar goes with 8 cups of flour?", "12", {
  "10": "That adds 2 to 8. Ratios grow by multiplying, not adding. Flour went from 2 to 8 (4 times), so sugar must also be 4 times as much.",
  "16": "That is 8 × 2, using only the flour part of the ratio. The sugar part of the ratio is 3.",
  "24": "That is 8 × 3, which treats 8 as the scale factor. Flour grew 4 times (2 to 8), so sugar is 3 × 4."});
W("A car travels 150 miles in 3 hours. At that rate, how far in 5 hours?", "250", {
  "200": "That adds only one more hour (150 + 50). Five hours is two more hours than three, so add 2 × 50 = 100.",
  "225": "That adds half of 150. Five hours is not 1.5 times three hours (that would be 4.5 hours).",
  "300": "That doubles 150, which would be 6 hours, not 5."});
W("The ratio of boys to girls is 4:5. There are 36 students. How many are girls?", "20", {
  "16": "That is the number of boys (4 × 4). Girls are the 5 part of the ratio, so 5 × 4.",
  "18": "That splits 36 in half, which would be a 1:1 ratio. Girls have 5 parts and boys 4.",
  "24": "24 girls would leave 12 boys, a 2:1 ratio, not 4:5."});
W("Which is the better buy?", "10 for $7.00", {
  "6 for $4.50": "That costs $0.75 each. 10 for $7.00 costs $0.70 each, which is cheaper.",
  "They cost the same": "They don't. $4.50 ÷ 6 = $0.75 each, but $7.00 ÷ 10 = $0.70 each.",
  "Cannot be determined": "It can. Divide each price by its count to get a price per item and compare."});
W("On a map, 1 inch = 25 miles. How many miles is 3.5 inches?", "87.5", {
  "75": "That is 3 × 25, which ignores the extra half inch. The half inch adds 12.5 miles.",
  "90": "That is 87.5 rounded up. The exact multiplication 3.5 × 25 is 87.5.",
  "100": "That is 4 × 25, which rounds 3.5 up to 4 before multiplying."});
W("Jo earns $13.50 per hour. How much for 38 hours?", "$513", {
  "$481": "That is 13 × 37: it drops the 50 cents and uses 37 hours. Use the full $13.50 and 38 hours.",
  "$525": "That is too high. 38 × 13 = 494, and the 50 cents adds 38 × 0.50 = 19, so 513.",
  "$540": "That is 13.50 × 40. She worked 38 hours, not 40."});
W("How many inches are in 3.5 feet?", "42", {
  "36": "That is 3 feet only. The extra half foot adds 6 inches.",
  "40": "There are 12 inches in a foot, so 3.5 feet is 3.5 × 12 = 42. 40 doesn't come from that.",
  "45": "45 inches is 3.75 feet. 3.5 feet is 3.5 × 12 = 42."});
W("2.5 liters equals how many milliliters?", "2,500", {
  "25": "That multiplies by 10. A liter is 1,000 milliliters, so multiply by 1,000.",
  "250": "That multiplies by 100. A liter is 1,000 milliliters.",
  "25,000": "That multiplies by 10,000. A liter is 1,000 milliliters, so move the decimal 3 places."});
W("8 ounces of cheese cost $3.20. What is the price per pound (16 ounces)?", "$6.40", {
  "$4.80": "That is 1.5 times $3.20. 16 ounces is twice 8 ounces, so the price doubles.",
  "$5.60": "That is 1.75 times $3.20. 16 ounces is exactly double 8 ounces.",
  "$7.20": "That is 2.25 times $3.20. Doubling the ounces doubles the price: $6.40."});
W("Pat drives 45 mph for 2.5 hours. How far does Pat drive?", "112.5 miles", {
  "90 miles": "That is 45 × 2, which drops the extra half hour (22.5 miles).",
  "100 miles": "That is a rough guess. Multiply: 45 × 2.5 = 90 + 22.5 = 112.5.",
  "125 miles": "That is 50 × 2.5, which uses 50 mph. The speed is 45 mph."});
W("Three pounds of apples cost $5.43. At this rate, how much do 5 pounds cost?", "$9.05", {
  "$8.15": "That treats 5 pounds as 1.5 times 3 pounds. It is 5/3 as much, so find $1.81 per pound first.",
  "$9.50": "That does not match the rate. $5.43 ÷ 3 = $1.81 per pound, and 5 × $1.81 = $9.05.",
  "$10.86": "That doubles $5.43, which would be 6 pounds, not 5."});
W("On a blueprint, 1/4 inch represents 3 feet. A wall is 2 inches long on the blueprint. How long is the real wall?", "24 feet", {
  "6 feet": "That is 2 × 3, which treats 1 inch as 3 feet. Here 1/4 inch is 3 feet, so 1 inch is 12 feet.",
  "12 feet": "That is 4 × 3. Two inches holds eight quarter-inches, not four.",
  "48 feet": "That is 16 × 3. Two inches holds eight quarter-inches, so 8 × 3 = 24."});
W("A machine fills 120 bottles in 8 minutes. At this rate, how many bottles in 15 minutes?", "225", {
  "160": "That does not match the rate. 120 ÷ 8 = 15 bottles per minute, and 160 bottles would take about 10.7 minutes.",
  "200": "That would take about 13.3 minutes at 15 bottles per minute, not 15 minutes.",
  "240": "That doubles 120, which would take 16 minutes. In 15 minutes: 15 × 15 = 225."});
W("How many hours are in 90 minutes?", "1.5", {
  "0.9": "That divides by 100, as if an hour had 100 minutes. An hour has 60 minutes.",
  "15": "That divides by 6. Divide by 60: 90 ÷ 60 = 1.5.",
  "9": "That divides by 10. An hour has 60 minutes, so divide by 60."});
W("Jun runs 6 miles in 54 minutes. What is her pace in minutes per mile?", "9", {
  "8": "At 8 minutes per mile, 6 miles would take 48 minutes. She took 54.",
  "10": "At 10 minutes per mile, 6 miles would take 60 minutes. She took 54.",
  "324": "That multiplies 6 × 54. Pace per mile means dividing the minutes by the miles."});
W("Four gallons of paint cover 1,400 square feet. How many gallons are needed to cover 2,450 square feet?", "7", {
  "6": "Six gallons cover only 6 × 350 = 2,100 square feet. That is not enough.",
  "8": "Eight gallons would cover 2,800 square feet, more than needed. Each gallon covers 350, so 2,450 ÷ 350 = 7.",
  "9": "Nine gallons would cover 3,150 square feet, far more than needed."});
W("A recipe for 6 servings uses 9 eggs. How many eggs are needed for 10 servings?", "15", {
  "12": "Twelve eggs is only enough for 8 servings, at 1.5 eggs each.",
  "14": "That adds 5 eggs for 4 more servings. Each serving takes 1.5 eggs, so 4 more servings take 6 more eggs.",
  "18": "Eighteen eggs makes 12 servings. For 10 servings: 1.5 × 10 = 15."});
W("How many feet are in 5 yards?", "15", {
  "8": "That adds 5 + 3. Convert by multiplying: 3 feet in each yard, so 5 × 3.",
  "12": "12 is the number of inches in a foot, not feet in a yard.",
  "60": "That is 5 × 12, which treats a yard as 12 units. A yard is 3 feet."});
W("A faucet drips 15 mL each minute. How many liters drip in one hour?", "0.9", {
  "0.09": "That is 90 mL. In one hour: 15 × 60 = 900 mL, and 900 mL is 0.9 L.",
  "9": "That is 9,000 mL. 15 × 60 = 900 mL, which is 0.9 L.",
  "90": "That is 90,000 mL. 900 mL is only 0.9 L."});
W("Brand A: 12 oz for $2.40. Brand B: 20 oz for $3.60. Brand C: 8 oz for $1.76. Which is the lowest price per ounce?", "Brand B", {
  "Brand A": "A is $0.20 per ounce, but B is $0.18, which is lower.",
  "Brand C": "C is $0.22 per ounce, the highest of the three.",
  "They are all equal": "They are not: $0.20, $0.18 and $0.22 per ounce."});
W("The ratio of cats to dogs at a shelter is 3:7. There are 28 dogs. How many cats are there?", "12", {
  "9": "That multiplies 3 × 3. Dogs are 7 parts and there are 28, so each part is 4 and cats are 3 × 4.",
  "21": "That treats 3:7 as 3 out of 4 (28 × 3/4). The ratio compares cats to dogs, not to the total.",
  "15": "A ratio of 15 cats to 28 dogs is not 3:7. 12 cats to 28 dogs is."});
W("A 12-pack costs $9.00 and a 20-pack costs $14.00. Which statement is true?", "The 20-pack is cheaper per item.", {
  "The 12-pack is cheaper per item.": "The 12-pack is $0.75 each. The 20-pack is $0.70 each, so the 20-pack is cheaper.",
  "They cost the same per item.": "They don't: $9.00 ÷ 12 = $0.75 and $14.00 ÷ 20 = $0.70.",
  "It cannot be determined.": "It can. Divide each price by its count and compare."});
W("2.4 kilometers is how many meters?", "2,400", {
  "24": "That multiplies by 10. A kilometer is 1,000 meters.",
  "240": "That multiplies by 100. A kilometer is 1,000 meters.",
  "24,000": "That multiplies by 10,000. A kilometer is 1,000 meters, so move the decimal 3 places."});
W("Five workers build a wall in 12 days. At the same rate, how many days would 10 workers need?", "6", {
  "24": "More workers means fewer days, not more. Twice the workers takes half the time.",
  "60": "That is the total work in worker-days (5 × 12). Divide by 10 workers to get days.",
  "8": "Eight days would need 7.5 workers. The work is 60 worker-days, and 60 ÷ 10 = 6."});
W("A car gets 28 miles per gallon and gas costs $3.50 per gallon. What does it cost to drive 140 miles?", "$17.50", {
  "$14.00": "That is 4 gallons at $3.50. The trip takes 140 ÷ 28 = 5 gallons.",
  "$19.60": "That would be 5.6 gallons. 140 ÷ 28 is exactly 5 gallons.",
  "$490": "That multiplies the miles by the price per gallon. First find the gallons used: 140 ÷ 28 = 5."});
