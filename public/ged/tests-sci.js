// Three full Science practice tests, 34 questions each (original questions).
const SC1A = "<p>A student places identical sprigs of an aquatic plant in four test tubes of water and shines the same lamp on each from a different distance. After 10 minutes, she counts the oxygen bubbles released from each sprig.</p>" + TBL(["Lamp distance (cm)", "10", "20", "30", "40"], [["Bubbles in 10 min", 48, 30, 18, 9]]);
const SC1B = "<p>In pea plants, purple flowers (P) are dominant over white flowers (p). A grower crosses a purple plant with the genotype Pp with a white plant. The cross produces 80 offspring.</p>";
const SC1C = "<p>In a meadow ecosystem, grass is eaten by grasshoppers and rabbits. Grasshoppers are eaten by frogs and birds. Rabbits are eaten by hawks. Frogs are eaten by snakes, and snakes are eaten by hawks.</p>";
const SC1D = LINE("Distance traveled by a cyclist", [[0, 0], [1, 3], [2, 6], [3, 6], [4, 8], [5, 10]], "Minutes", "Kilometers");
const SC1E = "<p>A student studies how reactions can change the mass of a system. She places baking soda in a flask and vinegar in a small tube inside it, seals the flask with a balloon, then tips the flask so the two mix. The balloon inflates. The mass of the whole setup is 250.0 g before mixing and 250.0 g after.</p>";
const SC1F = TBL(["Planet", "Distance from Sun (AU)", "Orbital period (Earth years)"], [["Mercury", 0.39, 0.24], ["Earth", 1.0, 1.0], ["Mars", 1.52, 1.88], ["Jupiter", 5.2, 11.9]], "1 AU = the distance from Earth to the Sun");

const SC2A = "<p>A student weighs four potato slices of equal mass and places each in a salt solution of a different concentration for one hour. She then reweighs the slices.</p>" + TBL(["Salt concentration", "0%", "0.5%", "1.0%", "2.0%"], [["Change in mass", "+12%", "+4%", "−3%", "−10%"]]);
const SC2B = TBL(["Activity", "Resting", "Walking", "Jogging", "Sprinting"], [["Heart rate (beats per minute)", 70, 95, 130, 170]]);
const SC2C = "<p>A park ranger tracks a rabbit population in a reserve that also contains foxes.</p>" + LINE("Rabbit population", [[1, 200], [2, 350], [3, 500], [4, 300], [5, 150], [6, 250]], "Year", "Rabbits");
const SC2D = "<p>Before the Industrial Revolution, most peppered moths in England were light-colored. As soot darkened tree bark, dark moths became more common. Birds ate whichever moths were easier to see against the bark.</p>";
const SC2G = "<p>Universal indicator turns red in strong acids, green in neutral solutions, and blue or purple in bases.</p>" + TBL(["Substance", "Indicator color"], [["Lemon juice", "Red"], ["Vinegar", "Red"], ["Pure water", "Green"], ["Baking soda solution", "Blue"], ["Soap solution", "Purple"]]);
const SC2H = TBL(["Year", "1960", "1980", "2000", "2020"], [["Atmospheric CO₂ (parts per million)", 317, 339, 369, 414]]);

const SC3A = "<p>When a person takes antibiotics, most of the bacteria causing the infection die. A few bacteria with random mutations that make them resistant may survive and multiply. Over time, a population of resistant bacteria can develop, especially if the patient stops taking the medicine early. Doctors now urge patients to finish the full course and to avoid antibiotics for viral illnesses like colds.</p>";
const SC3E = "<p>A pendulum is a weight hanging from a string. A student lifts the weight to one side and lets go. It swings back and forth, but each swing is a little lower than the one before. Eventually it stops.</p>";
const SC3F = "<p>A student drops an identical tablet into water at four different temperatures and measures how long it takes to dissolve completely.</p>" + TBL(["Water temperature (°C)", "10", "20", "30", "40"], [["Time to dissolve (seconds)", 120, 60, 30, 15]]);
const SC3G = TBL(["Energy source", "Cost per kWh", "CO₂ emissions"], [["Coal", "$0.05", "High"], ["Natural gas", "$0.05", "Medium"], ["Solar", "$0.06", "Very low"], ["Wind", "$0.04", "Very low"]]);
const SC3H = BAR("Electricity used per month (kWh)", ["Fridge", "A/C", "TV", "Washer"], [40, 120, 15, 25]);

TESTS.sci.push(
{ name: "Science Practice Test 1", qs: [
  X("s5", "What is the independent variable in this experiment?", ["Distance of the lamp from the plant", "Number of bubbles", "Type of plant", "Time"], 0, "It is the one thing the student changed.", SC1A),
  X("s5", "Which conclusion is best supported by the data?", ["Bubbles decrease as the lamp moves farther away.", "Bubbles increase as the lamp moves farther away.", "Distance has no effect.", "The plant stops growing."], 0, "The count falls from 48 to 9.", SC1A),
  X("s1", "Which process produced the oxygen bubbles?", ["Photosynthesis", "Respiration", "Digestion", "Evaporation"], 0, "Plants release oxygen during photosynthesis.", SC1A),
  X("s5", "If the lamp were placed 50 cm away, how many bubbles would be expected?", ["More than 9", "Fewer than 9", "Exactly 9", "48"], 1, "The trend suggests fewer bubbles with more distance.", SC1A),
  X("s1", "What is the probability that an offspring has white flowers?", ["0", "1/4", "1/2", "1"], 2, "Pp × pp gives Pp, Pp, pp, pp: half are white.", SC1B),
  X("s1", "What is the genotype of the white-flowered plants?", ["PP", "Pp", "pp", "Pw"], 2, "White is recessive, so it must be pp.", SC1B),
  X("s1", "About how many of the 80 offspring would you expect to have purple flowers?", ["20", "40", "60", "80"], 1, "Half of 80 is 40.", SC1B),
  X("s1", "Which organism is a producer?", ["Grass", "Grasshopper", "Frog", "Hawk"], 0, "Producers make their own food from sunlight.", SC1C),
  X("s1", "If all the snakes were removed, what would most likely happen to the frog population at first?", ["It would increase", "It would decrease", "It would disappear", "It would not change"], 0, "Snakes eat frogs, so fewer predators means more frogs.", SC1C),
  X("s1", "Which organism is both a predator and prey?", ["Grass", "Grasshopper", "Frog", "Hawk"], 2, "Frogs eat grasshoppers and are eaten by snakes.", SC1C),
  X("s2", "What was the cyclist's speed during the first 2 minutes?", ["2 km/min", "3 km/min", "6 km/min", "0 km/min"], 1, "6 km in 2 minutes = 3 km/min.", SC1D),
  X("s2", "What happened between minute 2 and minute 3?", ["The cyclist stopped.", "The cyclist sped up.", "The cyclist turned around.", "The cyclist slowed to 1 km/min."], 0, "The distance stayed at 6 km.", SC1D),
  X("s2", "What was the cyclist's average speed over all 5 minutes?", ["1 km/min", "2 km/min", "3 km/min", "10 km/min"], 1, "10 km ÷ 5 min = 2 km/min.", SC1D),
  X("s2", "During which interval was the cyclist's speed greatest?", ["0 to 2 minutes", "2 to 3 minutes", "3 to 4 minutes", "4 to 5 minutes"], 0, "The slope of the line is steepest from 0 to 2 minutes.", SC1D),
  X("s2", "The same force pushes a 1,000 kg car and a 2,000 kg truck. Which accelerates more?", ["The car", "The truck", "Both equally", "Neither"], 0, "a = F ÷ m: less mass gives more acceleration."),
  X("s2", "A 2,000 kg truck accelerates at 3 m/s². What is the net force on it?", ["667 N", "2,003 N", "6,000 N", "1,997 N"], 2, "F = ma = 2,000 × 3 = 6,000 N."),
  X("s2", "A rocket's engine pushes hot gas downward and the rocket moves upward. Which law explains this?", ["Newton's first law", "Newton's second law", "Newton's third law", "Law of conservation of mass"], 2, "Action and reaction forces are equal and opposite."),
  X("s2", "A roller coaster car is at the top of the first hill. At that point it has the greatest...", ["potential energy", "kinetic energy", "speed", "friction"], 0, "Highest point means most stored (gravitational) energy."),
  X("s3", "What is the best evidence of a chemical change in this experiment?", ["Gas was produced and inflated the balloon.", "The flask was cold.", "The liquid was clear.", "The mass changed."], 0, "Gas formation is a sign of a new substance.", SC1E),
  X("s3", "Why did the total mass stay at 250.0 g?", ["Atoms were not created or destroyed in the sealed system.", "No reaction occurred.", "The balloon weighs nothing.", "Gas has no mass."], 0, "Conservation of mass: the gas stayed in the balloon.", SC1E),
  X("s5", "If the balloon were removed and the experiment done in an open flask, the final mass would be...", ["less, because gas escapes", "more, because vinegar evaporates", "exactly the same", "zero"], 0, "The escaping gas carries mass away.", SC1E),
  X("s5", "Which procedure would best test whether temperature affects the reaction rate?", ["Use vinegar at different temperatures, keeping everything else the same", "Use different amounts of baking soda each time", "Change the flask size", "Use no vinegar"], 0, "Change one variable and control the others.", SC1E),
  X("s3", "An object has a mass of 90 g and a volume of 30 cm³. Water has a density of 1 g/cm³. What will happen when the object is placed in water?", ["It will sink", "It will float", "It will dissolve", "It will float halfway"], 0, "Density = 3 g/cm³, which is greater than water's."),
  X("s3", "Sodium and potassium are in the same column of the periodic table. This means they...", ["have similar chemical properties", "have the same number of protons", "have the same mass", "are both gases"], 0, "Elements in a group react in similar ways."),
  X("s4", "Which statement describes the pattern in the data?", ["The farther a planet is from the Sun, the longer its orbit takes.", "The closer a planet is to the Sun, the longer its orbit takes.", "Orbit length does not depend on distance.", "All orbits take one year."], 0, "Orbital period increases with distance.", SC1F),
  X("s4", "Which planet takes the longest to orbit the Sun?", ["Mercury", "Earth", "Mars", "Jupiter"], 3, "Jupiter's period is 11.9 years.", SC1F),
  X("s4", "A planet 3 AU from the Sun would most likely have an orbital period of...", ["0.5 years", "1 year", "about 5 years", "more than 20 years"], 2, "It should fall between Mars (1.88) and Jupiter (11.9).", SC1F),
  X("s4", "Earth has seasons because...", ["its axis is tilted", "it moves closer to the Sun in summer", "the Moon blocks sunlight", "the Sun changes brightness"], 0, "The tilt changes how directly sunlight strikes each hemisphere."),
  X("s4", "In which type of rock are fossils most likely to be found?", ["Sedimentary rock", "Igneous rock", "Metamorphic rock", "Volcanic glass"], 0, "Sedimentary layers bury organisms gently, and heat does not destroy them."),
  X("s4", "Burning fossil fuels increases the amount of which gas in the atmosphere?", ["Carbon dioxide", "Helium", "Argon", "Neon"], 0, "Carbon in fuel combines with oxygen to form CO₂."),
  X("s5", "On which day were the most steps taken?", ["Monday", "Tuesday", "Wednesday", "Thursday"], 3, "Thursday has the tallest bar (9).", BAR("Average daily steps (thousands)", ["Mon", "Tue", "Wed", "Thu", "Fri"], [6, 8, 5, 9, 7])),
  X("s5", "How many more steps were taken on the busiest day than the least busy day?", ["2,000", "3,000", "4,000", "5,000"], 2, "9 thousand − 5 thousand = 4 thousand.", BAR("Average daily steps (thousands)", ["Mon", "Tue", "Wed", "Thu", "Fri"], [6, 8, 5, 9, 7])),
  X("s5", "A study finds that students who eat breakfast score higher on tests. Which would best help show whether breakfast causes the higher scores?", ["Randomly assign students to eat breakfast or not and compare scores", "Survey more students", "Ask students which meal they like best", "Compare students from different grades"], 0, "A controlled experiment can separate cause from correlation."),
  X("s5", "Which conclusion is supported by the table?", ["More sleep is related to faster reaction times.", "Less sleep makes people taller.", "Reaction time does not change.", "People need 4 hours of sleep."], 0, "Reaction time falls as sleep increases.", TBL(["Hours of sleep", "4", "6", "8"], [["Reaction time (ms)", 310, 270, 240]])),
] },

{ name: "Science Practice Test 2", qs: [
  X("s5", "What is the dependent variable in this experiment?", ["Change in mass of the potato slice", "Salt concentration", "Time in solution", "Type of potato"], 0, "It is what the student measures.", SC2A),
  X("s1", "Why did the slice in 0% salt water gain mass?", ["Water moved into the cells by osmosis", "Salt moved out of the cells", "The potato grew", "Starch turned to water"], 0, "Water moves toward the area with more dissolved material.", SC2A),
  X("s5", "The potato cells are probably closest in concentration to a solution of about...", ["0%", "0.7%", "1.5%", "2%"], 1, "Mass change goes from positive to negative between 0.5% and 1.0%, so the balance point is about 0.7%.", SC2A),
  X("s5", "Why did the student use slices of equal mass?", ["To make a fair comparison", "To speed up the experiment", "To change the solution", "To measure time"], 0, "Controlling variables keeps the test fair.", SC2A),
  X("s5", "How does heart rate change as activity increases?", ["It increases", "It decreases", "It stays the same", "It cannot be determined"], 0, "The numbers rise with each activity.", SC2B),
  X("s1", "Why does the heart rate rise during exercise?", ["Muscles need more oxygen and fuel", "The body is cooling down", "Digestion speeds up", "The brain needs less blood"], 0, "Faster pumping delivers more oxygen to working muscles.", SC2B),
  X("s1", "Which system works with the circulatory system to deliver oxygen to the body?", ["Respiratory system", "Skeletal system", "Digestive system", "Endocrine system"], 0, "The lungs take in oxygen, and blood carries it.", SC2B),
  X("s5", "In which year was the rabbit population highest?", ["Year 2", "Year 3", "Year 4", "Year 6"], 1, "The peak is 500 rabbits in year 3.", SC2C),
  X("s1", "What most likely caused the rabbit population to decline after year 3?", ["Increased predation and limited food", "More space", "Fewer foxes", "Warmer weather only"], 0, "A large rabbit population feeds predators and uses up food.", SC2C),
  X("s1", "The maximum population an environment can support is called its...", ["carrying capacity", "food chain", "habitat", "niche"], 0, "Limited resources set a cap on population.", SC2C),
  X("s1", "If all the foxes were removed, what would most likely happen to the rabbits at first?", ["The population would grow", "The population would shrink", "No change", "They would disappear"], 0, "Less predation lets the population grow until food runs out.", SC2C),
  X("s1", "Which explains why dark moths became more common?", ["Dark moths were better camouflaged, so more survived and reproduced", "Moths chose to change color", "Soot turned light moths dark", "Birds preferred dark moths"], 0, "This is natural selection.", SC2D),
  X("s1", "Natural selection acts on...", ["variation in a population", "individual choices", "learned behaviors", "weather"], 0, "Some individuals have traits that help them survive better.", SC2D),
  X("s1", "If air pollution decreased and tree bark became lighter again, what would you predict?", ["Light moths would become more common", "Dark moths would become more common", "Moths would disappear", "Nothing would change"], 0, "The environment now favors lighter moths.", SC2D),
  X("s2", "Which type of wave requires a medium to travel?", ["Sound waves", "Light waves", "Radio waves", "X-rays"], 0, "Sound needs matter to vibrate."),
  X("s2", "A sound wave with a higher frequency has a...", ["higher pitch", "lower pitch", "greater volume", "slower speed"], 0, "Higher frequency means higher pitch."),
  X("s2", "A wave has a frequency of 5 Hz and a wavelength of 2 meters. What is its speed?", ["2.5 m/s", "7 m/s", "10 m/s", "0.4 m/s"], 2, "Speed = frequency × wavelength = 5 × 2."),
  X("s2", "A circuit has a 9-volt battery and a current of 3 amps. What is the resistance?", ["3 ohms", "27 ohms", "6 ohms", "12 ohms"], 0, "R = V ÷ I = 9 ÷ 3."),
  X("s2", "In a parallel circuit, if one bulb burns out, the others...", ["stay lit", "go out", "get dimmer", "explode"], 0, "Each bulb has its own path."),
  X("s2", "A hair dryer converts electrical energy mainly into...", ["heat and motion", "chemical energy", "nuclear energy", "light only"], 0, "A heater warms the air, and a fan moves it."),
  X("s3", "Which substance in the table is neutral?", ["Pure water", "Lemon juice", "Vinegar", "Soap solution"], 0, "Green means neutral.", SC2G),
  X("s3", "Which two substances are acidic?", ["Lemon juice and vinegar", "Water and soap", "Baking soda and soap", "Vinegar and water"], 0, "Both turn red.", SC2G),
  X("s5", "Ammonia is a base. What color would the indicator most likely show?", ["Blue or purple", "Red", "Green", "Yellow"], 0, "Bases turn the indicator blue or purple.", SC2G),
  X("s3", "What happens when an acid and a base are mixed in the right amounts?", ["They neutralize each other, moving toward pH 7", "They explode", "They both become stronger", "Nothing happens"], 0, "Neutralization forms water and a salt."),
  X("s3", "How do the particles in a gas behave?", ["They are far apart and move freely", "They are tightly packed and still", "They slide past each other but stay close", "They don't move"], 0, "Gas particles have lots of space and energy."),
  X("s3", "While ice is melting at 0°C, the temperature of the ice-water mixture...", ["stays constant", "rises quickly", "falls", "doubles"], 0, "The energy goes into breaking the solid structure."),
  X("s4", "Earthquakes are mainly caused by...", ["sudden movement of rock along faults", "storms", "the Moon", "ocean waves"], 0, "Stress builds up and releases suddenly."),
  X("s4", "Limestone changes into marble through...", ["heat and pressure", "cooling magma", "erosion alone", "freezing"], 0, "That makes it a metamorphic rock."),
  X("s4", "What trend does the data show?", ["Atmospheric CO₂ has been rising", "CO₂ has been falling", "CO₂ has stayed constant", "No pattern"], 0, "From 317 to 414 ppm.", SC2H),
  X("s4", "Which human activity most contributes to the rise in CO₂?", ["Burning fossil fuels", "Planting trees", "Recycling", "Using wind turbines"], 0, "It releases carbon stored for millions of years."),
  X("s4", "Ocean tides are caused mainly by...", ["the gravity of the Moon", "wind", "the Earth's tilt", "the Sun's heat"], 0, "The Moon's pull creates bulges of water."),
  X("s4", "A light-year is a unit of...", ["distance", "time", "speed", "brightness"], 0, "It's how far light travels in a year."),
  X("s5", "A student times a falling ball three times: 4.1 s, 3.9 s and 4.0 s. What is the average time?", ["3.9 s", "4.0 s", "4.1 s", "12.0 s"], 1, "(4.1 + 3.9 + 4.0) ÷ 3 = 4.0."),
  X("s5", "Cities with more firefighters tend to have more fires. What is the best explanation?", ["Larger cities have both more fires and more firefighters", "Firefighters cause fires", "Fires create firefighters", "There is no explanation"], 0, "A third factor, city size, explains the correlation."),
] },

{ name: "Science Practice Test 3", qs: [
  X("s1", "Why do antibiotic-resistant bacteria become more common?", ["Resistant bacteria survive treatment and reproduce", "Antibiotics create resistance in a single dose", "Bacteria learn from medicine", "Viruses turn into bacteria"], 0, "This is natural selection in action.", SC3A),
  X("s1", "Why shouldn't antibiotics be used for colds?", ["Colds are caused by viruses, which antibiotics do not kill", "Colds are not real illnesses", "Antibiotics only work on fungi", "Antibiotics make colds worse"], 0, "Antibiotics target bacteria.", SC3A),
  X("s1", "Why should a patient finish the entire course of antibiotics?", ["Stopping early may leave stronger bacteria alive", "To use up the medicine", "To avoid side effects", "It makes the pills work faster"], 0, "Survivors are more likely to be resistant.", SC3A),
  X("s1", "Which statement is supported by the passage?", ["Resistance arises from random mutations that survive treatment", "Antibiotics cause mutations", "Most bacteria are harmful", "Resistance is only in viruses"], 0, "The passage describes random mutations and survival.", SC3A),
  X("s1", "In DNA, the base adenine (A) pairs with...", ["thymine (T)", "cytosine (C)", "guanine (G)", "uracil (U)"], 0, "A pairs with T, and C pairs with G."),
  X("s1", "A mutation is...", ["a change in the DNA sequence", "a type of cell", "a protein", "a food source"], 0, "Mutations can be harmful, neutral or helpful."),
  X("s1", "Cells build proteins using instructions from...", ["DNA", "starch", "water", "oxygen"], 0, "DNA's code is copied into RNA and used by ribosomes."),
  X("s1", "In photosynthesis, which are the reactants?", ["Carbon dioxide and water", "Glucose and oxygen", "Oxygen and water", "Glucose and carbon dioxide"], 0, "Carbon dioxide and water, with light, make glucose and oxygen."),
  X("s1", "Which organisms carry out cellular respiration?", ["Both plants and animals", "Only animals", "Only plants", "Only bacteria"], 0, "All living cells release energy through respiration."),
  X("s4", "What is the most likely effect of widespread deforestation on atmospheric CO₂?", ["It increases", "It decreases", "It stays the same", "It disappears"], 0, "Fewer trees means less CO₂ is absorbed."),
  X("s2", "A 5 kg object has a net force of 20 N acting on it. What is its acceleration?", ["4 m/s²", "100 m/s²", "0.25 m/s²", "15 m/s²"], 0, "a = F ÷ m = 20 ÷ 5."),
  X("s2", "If the net force on an object doubles while its mass stays the same, its acceleration...", ["doubles", "halves", "stays the same", "quadruples"], 0, "a is proportional to F."),
  X("s2", "A 1,000 kg car accelerates at 2 m/s². What net force acts on it?", ["500 N", "2,000 N", "1,002 N", "998 N"], 1, "F = 1,000 × 2."),
  X("s2", "A box slides across a floor and slows to a stop. Which force is mainly responsible?", ["Friction", "Gravity pulling sideways", "Magnetism", "Inertia pushing back"], 0, "Friction opposes sliding and converts motion to heat."),
  X("s2", "At the lowest point of the pendulum's swing, the weight has the greatest...", ["kinetic energy", "potential energy", "mass", "height"], 0, "It's moving fastest there.", SC3E),
  X("s2", "At the highest point of its swing (just before it turns back), the weight has the greatest...", ["potential energy", "kinetic energy", "speed", "temperature"], 0, "It momentarily stops at maximum height.", SC3E),
  X("s2", "Why does the pendulum eventually stop?", ["Some energy is lost as heat due to friction and air resistance", "Energy is destroyed", "Gravity turns off", "The string absorbs all energy"], 0, "Energy is conserved but spreads out as heat.", SC3E),
  X("s5", "What does the data show?", ["Higher temperatures make the tablet dissolve faster", "Higher temperatures slow dissolving", "Temperature has no effect", "The tablet dissolves at the same rate"], 0, "Time falls as temperature increases.", SC3F),
  X("s5", "At 50°C, the time to dissolve would most likely be...", ["less than 15 seconds", "more than 15 seconds", "exactly 15 seconds", "120 seconds"], 0, "The trend continues downward.", SC3F),
  X("s3", "Why does a higher temperature speed up a reaction?", ["Particles move faster and collide more often", "Particles get larger", "Particles disappear", "Mass increases"], 0, "More frequent and harder collisions make reactions happen faster.", SC3F),
  X("s3", "Which method separates salt from salt water?", ["Evaporating the water", "Using a magnet", "Pouring through a coffee filter", "Freezing it solid"], 0, "The water evaporates and the salt remains."),
  X("s3", "A molecule of carbon dioxide (CO₂) contains...", ["one carbon atom and two oxygen atoms", "two carbon atoms and one oxygen atom", "one carbon and one oxygen atom", "two carbon and two oxygen atoms"], 0, "The subscript 2 applies to oxygen."),
  X("s3", "In CH₄ + 2O₂ → CO₂ + 2H₂O, how many hydrogen atoms are on the product side?", ["2", "4", "6", "8"], 1, "2H₂O has 2 × 2 = 4 hydrogen atoms."),
  X("s4", "Which energy source has the lowest cost and very low CO₂ emissions?", ["Wind", "Solar", "Coal", "Natural gas"], 0, "Wind costs $0.04 per kWh with very low emissions.", SC3G),
  X("s4", "Which source is nonrenewable and has the highest emissions?", ["Coal", "Natural gas", "Solar", "Wind"], 0, "Coal's emissions are listed as high.", SC3G),
  X("s4", "Which process adds water vapor to the air from plants?", ["Transpiration", "Erosion", "Condensation", "Precipitation"], 0, "Plants release water vapor through their leaves."),
  X("s4", "Hurricanes form over...", ["warm ocean water", "cold deserts", "high mountains", "polar ice"], 0, "Warm water supplies the energy."),
  X("s4", "In undisturbed rock layers, the oldest fossils are usually found...", ["in the deepest layers", "at the top", "in the middle only", "in igneous rocks only"], 0, "Older layers are buried beneath newer ones."),
  X("s4", "The Milky Way is...", ["a galaxy containing billions of stars", "a single star", "a planet", "a comet"], 0, "Our solar system is part of it."),
  X("s4", "What force keeps planets in orbit around the Sun?", ["Gravity", "Friction", "Magnetism", "Wind"], 0, "The Sun's gravity pulls on the planets."),
  X("s5", "Which appliance uses the most electricity?", ["Refrigerator", "A/C", "TV", "Washer"], 1, "A/C has the tallest bar.", SC3H),
  X("s5", "Together, the four appliances use 200 kWh. What percent is used by the A/C?", ["40%", "50%", "60%", "75%"], 2, "120 ÷ 200 = 0.60.", SC3H),
  X("s5", "A sample has a mass of 2,500 grams. How many kilograms is that?", ["0.25", "2.5", "25", "250"], 1, "Divide by 1,000."),
  X("s5", "A scientist repeats an experiment many times and always gets the same results. This shows that the results are...", ["reproducible and more reliable", "wrong", "random", "unscientific"], 0, "Repeatable results increase confidence."),
] }
);
