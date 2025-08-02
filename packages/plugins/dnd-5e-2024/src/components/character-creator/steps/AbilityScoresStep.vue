<template>
  <div class="ability-scores-step">
    <div class="step-header mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Assign Ability Scores</h2>
      <p class="text-gray-600 mt-2">
        Determine your character's six ability scores: Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma.
      </p>
    </div>

    <div class="ability-scores-content">
      <!-- Method Selection -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-3">
          Score Generation Method
        </label>
        <div class="space-y-2">
          <label class="flex items-center">
            <input
              v-model="localData.method"
              type="radio"
              value="standard"
              class="mr-2"
              @change="() => { clearScoresForMethod(); updateAbilities(); }"
            />
            <span class="text-sm text-gray-900 font-medium">Standard Array (15, 14, 13, 12, 10, 8)</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="localData.method"
              type="radio"
              value="pointbuy"
              class="mr-2"
              @change="() => { clearScoresForMethod(); updateAbilities(); }"
            />
            <span class="text-sm text-gray-900 font-medium">Point Buy (27 points to distribute)</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="localData.method"
              type="radio"
              value="roll"
              class="mr-2"
              @change="() => { clearScoresForMethod(); updateAbilities(); }"
            />
            <span class="text-sm text-gray-900 font-medium">Roll 4d6 (drop lowest)</span>
          </label>
        </div>
      </div>

      <!-- Ability Score Assignment -->
      <div v-if="localData.method" class="space-y-6">
        <!-- Standard Array Instructions -->
        <div v-if="localData.method === 'standard'" class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Standard Array</h3>
          <p class="text-gray-800 text-sm mb-3">
            Assign these six scores to your abilities: <strong>15, 14, 13, 12, 10, 8</strong>
          </p>
          <div class="text-sm text-gray-700">
            Click the dropdown next to each ability to assign a score.
          </div>
        </div>

        <!-- Dice Rolling Instructions -->
        <div v-if="localData.method === 'roll'" class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-lg font-semibold text-purple-900 mb-2">Roll 4d6 (Drop Lowest)</h3>
              <p class="text-purple-800 text-sm">
                Roll six sets of four 6-sided dice (drop lowest) and assign the results to your abilities.
              </p>
            </div>
            <button
              @click="rollAllAbilities"
              :disabled="rollingInProgress"
              class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon v-if="rollingInProgress" name="loading" class="w-4 h-4 mr-2 animate-spin" />
              {{ rollingInProgress ? 'Rolling...' : 'Roll 6 Scores' }}
            </button>
          </div>
          <div v-if="lastRollDetails.length > 0" class="text-sm text-purple-700">
            <strong>Generated scores:</strong> {{ formatRollDetails() }}
          </div>
          <div v-if="localData.availableScores && localData.availableScores.length > 0" class="text-sm text-purple-800 mt-2">
            <strong>Available scores:</strong> {{ localData.availableScores.join(', ') }}
            <br />
            <em>Use the dropdowns below to assign these scores to your abilities.</em>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Strength -->
          <div class="ability-score-card border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">
                Strength
              </label>
              <div class="text-lg font-bold text-gray-900">
                {{ localData.strength !== undefined ? finalScores.strength : '--' }}
                <span v-if="localData.strength !== undefined" class="text-sm text-gray-500 ml-1">
                  ({{ getModifier(finalScores.strength) >= 0 ? '+' : '' }}{{ getModifier(finalScores.strength) }})
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Point Buy Controls -->
              <div v-if="localData.method === 'pointbuy'" class="flex items-center space-x-1">
                <button
                  type="button"
                  @click="adjustScore('strength', -1)"
                  :disabled="(localData.strength || 8) <= 8"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-12 text-center text-sm font-medium">
                  {{ localData.strength || 8 }}
                </div>
                <button
                  type="button"
                  @click="adjustScore('strength', 1)"
                  :disabled="(localData.strength || 8) >= 15 || (localData.pointsRemaining || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
              
              <!-- Dropdown (Standard Array and Roll) -->
              <div v-else-if="localData.method === 'standard' || (localData.method === 'roll' && localData.availableScores && localData.availableScores.length > 0)" class="flex-1">
                <MobileSelect
                  :model-value="localData.strength || null"
                  :options="availableAbilityScores"
                  placeholder="Choose score..."
                  value-key="value"
                  label-key="label"
                  @update:model-value="(value) => handleAbilitySelection('strength', value)"
                />
              </div>
              
              <!-- Roll Input (manual entry fallback) -->
              <input
                v-else
                v-model.number="localData.strength"
                type="number"
                min="3"
                max="18"
                class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                @input="updateAbilities"
                :placeholder="localData.method === 'roll' ? 'Roll scores first' : ''"
                :disabled="localData.method === 'roll' && (!localData.availableScores || localData.availableScores.length === 0)"
              />
              
              <div v-if="getBackgroundBonus('strength')" class="text-sm text-blue-600 font-medium">
                +{{ getBackgroundBonus('strength') }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Base: {{ localData.method === 'standard' ? (localData.strength || '—') : (localData.strength || '—') }}{{ getBackgroundBonus('strength') ? ` + ${getBackgroundBonus('strength')} (bg)` : '' }}
            </div>
          </div>

          <!-- Dexterity -->
          <div class="ability-score-card border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">
                Dexterity
              </label>
              <div class="text-lg font-bold text-gray-900">
                {{ localData.dexterity !== undefined ? finalScores.dexterity : '--' }}
                <span v-if="localData.dexterity !== undefined" class="text-sm text-gray-500 ml-1">
                  ({{ getModifier(finalScores.dexterity) >= 0 ? '+' : '' }}{{ getModifier(finalScores.dexterity) }})
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Point Buy Controls -->
              <div v-if="localData.method === 'pointbuy'" class="flex items-center space-x-1">
                <button
                  type="button"
                  @click="adjustScore('dexterity', -1)"
                  :disabled="(localData.dexterity || 8) <= 8"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-12 text-center text-sm font-medium">
                  {{ localData.dexterity || 8 }}
                </div>
                <button
                  type="button"
                  @click="adjustScore('dexterity', 1)"
                  :disabled="(localData.dexterity || 8) >= 15 || (localData.pointsRemaining || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
              
              <!-- Dropdown (Standard Array and Roll) -->
              <div v-else-if="localData.method === 'standard' || (localData.method === 'roll' && localData.availableScores && localData.availableScores.length > 0)" class="flex-1">
                <MobileSelect
                  :model-value="localData.dexterity || null"
                  :options="availableAbilityScores"
                  placeholder="Choose score..."
                  value-key="value"
                  label-key="label"
                  @update:model-value="(value) => handleAbilitySelection('dexterity', value)"
                />
              </div>
              
              <!-- Roll Input (manual entry fallback) -->
              <input
                v-else
                v-model.number="localData.dexterity"
                type="number"
                min="3"
                max="18"
                class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                @input="updateAbilities"
                :placeholder="localData.method === 'roll' ? 'Roll scores first' : ''"
                :disabled="localData.method === 'roll' && (!localData.availableScores || localData.availableScores.length === 0)"
              />
              
              <div v-if="getBackgroundBonus('dexterity')" class="text-sm text-blue-600 font-medium">
                +{{ getBackgroundBonus('dexterity') }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Base: {{ localData.method === 'standard' ? (localData.dexterity || '—') : (localData.dexterity || '—') }}{{ getBackgroundBonus('dexterity') ? ` + ${getBackgroundBonus('dexterity')} (bg)` : '' }}
            </div>
          </div>

          <!-- Constitution -->
          <div class="ability-score-card border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">
                Constitution
              </label>
              <div class="text-lg font-bold text-gray-900">
                {{ localData.constitution !== undefined ? finalScores.constitution : '--' }}
                <span v-if="localData.constitution !== undefined" class="text-sm text-gray-500 ml-1">
                  ({{ getModifier(finalScores.constitution) >= 0 ? '+' : '' }}{{ getModifier(finalScores.constitution) }})
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Point Buy Controls -->
              <div v-if="localData.method === 'pointbuy'" class="flex items-center space-x-1">
                <button
                  type="button"
                  @click="adjustScore('constitution', -1)"
                  :disabled="(localData.constitution || 8) <= 8"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-12 text-center text-sm font-medium">
                  {{ localData.constitution || 8 }}
                </div>
                <button
                  type="button"
                  @click="adjustScore('constitution', 1)"
                  :disabled="(localData.constitution || 8) >= 15 || (localData.pointsRemaining || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
              
              <!-- Dropdown (Standard Array and Roll) -->
              <div v-else-if="localData.method === 'standard' || (localData.method === 'roll' && localData.availableScores && localData.availableScores.length > 0)" class="flex-1">
                <MobileSelect
                  :model-value="localData.constitution || null"
                  :options="availableAbilityScores"
                  placeholder="Choose score..."
                  value-key="value"
                  label-key="label"
                  @update:model-value="(value) => handleAbilitySelection('constitution', value)"
                />
              </div>
              
              <!-- Roll Input (manual entry fallback) -->
              <input
                v-else
                v-model.number="localData.constitution"
                type="number"
                min="3"
                max="18"
                class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                @input="updateAbilities"
                :placeholder="localData.method === 'roll' ? 'Roll scores first' : ''"
                :disabled="localData.method === 'roll' && (!localData.availableScores || localData.availableScores.length === 0)"
              />
              
              <div v-if="getBackgroundBonus('constitution')" class="text-sm text-blue-600 font-medium">
                +{{ getBackgroundBonus('constitution') }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Base: {{ localData.method === 'standard' ? (localData.constitution || '—') : (localData.constitution || '—') }}{{ getBackgroundBonus('constitution') ? ` + ${getBackgroundBonus('constitution')} (bg)` : '' }}
            </div>
          </div>

          <!-- Intelligence -->
          <div class="ability-score-card border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">
                Intelligence
              </label>
              <div class="text-lg font-bold text-gray-900">
                {{ localData.intelligence !== undefined ? finalScores.intelligence : '--' }}
                <span v-if="localData.intelligence !== undefined" class="text-sm text-gray-500 ml-1">
                  ({{ getModifier(finalScores.intelligence) >= 0 ? '+' : '' }}{{ getModifier(finalScores.intelligence) }})
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Point Buy Controls -->
              <div v-if="localData.method === 'pointbuy'" class="flex items-center space-x-1">
                <button
                  type="button"
                  @click="adjustScore('intelligence', -1)"
                  :disabled="(localData.intelligence || 8) <= 8"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-12 text-center text-sm font-medium">
                  {{ localData.intelligence || 8 }}
                </div>
                <button
                  type="button"
                  @click="adjustScore('intelligence', 1)"
                  :disabled="(localData.intelligence || 8) >= 15 || (localData.pointsRemaining || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
              
              <!-- Dropdown (Standard Array and Roll) -->
              <div v-else-if="localData.method === 'standard' || (localData.method === 'roll' && localData.availableScores && localData.availableScores.length > 0)" class="flex-1">
                <MobileSelect
                  :model-value="localData.intelligence || null"
                  :options="availableAbilityScores"
                  placeholder="Choose score..."
                  value-key="value"
                  label-key="label"
                  @update:model-value="(value) => handleAbilitySelection('intelligence', value)"
                />
              </div>
              
              <!-- Roll Input (manual entry fallback) -->
              <input
                v-else
                v-model.number="localData.intelligence"
                type="number"
                min="3"
                max="18"
                class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                @input="updateAbilities"
                :placeholder="localData.method === 'roll' ? 'Roll scores first' : ''"
                :disabled="localData.method === 'roll' && (!localData.availableScores || localData.availableScores.length === 0)"
              />
              
              <div v-if="getBackgroundBonus('intelligence')" class="text-sm text-blue-600 font-medium">
                +{{ getBackgroundBonus('intelligence') }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Base: {{ localData.method === 'standard' ? (localData.intelligence || '—') : (localData.intelligence || '—') }}{{ getBackgroundBonus('intelligence') ? ` + ${getBackgroundBonus('intelligence')} (bg)` : '' }}
            </div>
          </div>

          <!-- Wisdom -->
          <div class="ability-score-card border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">
                Wisdom
              </label>
              <div class="text-lg font-bold text-gray-900">
                {{ localData.wisdom !== undefined ? finalScores.wisdom : '--' }}
                <span v-if="localData.wisdom !== undefined" class="text-sm text-gray-500 ml-1">
                  ({{ getModifier(finalScores.wisdom) >= 0 ? '+' : '' }}{{ getModifier(finalScores.wisdom) }})
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Point Buy Controls -->
              <div v-if="localData.method === 'pointbuy'" class="flex items-center space-x-1">
                <button
                  type="button"
                  @click="adjustScore('wisdom', -1)"
                  :disabled="(localData.wisdom || 8) <= 8"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-12 text-center text-sm font-medium">
                  {{ localData.wisdom || 8 }}
                </div>
                <button
                  type="button"
                  @click="adjustScore('wisdom', 1)"
                  :disabled="(localData.wisdom || 8) >= 15 || (localData.pointsRemaining || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
              
              <!-- Dropdown (Standard Array and Roll) -->
              <div v-else-if="localData.method === 'standard' || (localData.method === 'roll' && localData.availableScores && localData.availableScores.length > 0)" class="flex-1">
                <MobileSelect
                  :model-value="localData.wisdom || null"
                  :options="availableAbilityScores"
                  placeholder="Choose score..."
                  value-key="value"
                  label-key="label"
                  @update:model-value="(value) => handleAbilitySelection('wisdom', value)"
                />
              </div>
              
              <!-- Roll Input (manual entry fallback) -->
              <input
                v-else
                v-model.number="localData.wisdom"
                type="number"
                min="3"
                max="18"
                class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                @input="updateAbilities"
                :placeholder="localData.method === 'roll' ? 'Roll scores first' : ''"
                :disabled="localData.method === 'roll' && (!localData.availableScores || localData.availableScores.length === 0)"
              />
              
              <div v-if="getBackgroundBonus('wisdom')" class="text-sm text-blue-600 font-medium">
                +{{ getBackgroundBonus('wisdom') }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Base: {{ localData.method === 'standard' ? (localData.wisdom || '—') : (localData.wisdom || '—') }}{{ getBackgroundBonus('wisdom') ? ` + ${getBackgroundBonus('wisdom')} (bg)` : '' }}
            </div>
          </div>

          <!-- Charisma -->
          <div class="ability-score-card border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">
                Charisma
              </label>
              <div class="text-lg font-bold text-gray-900">
                {{ localData.charisma !== undefined ? finalScores.charisma : '--' }}
                <span v-if="localData.charisma !== undefined" class="text-sm text-gray-500 ml-1">
                  ({{ getModifier(finalScores.charisma) >= 0 ? '+' : '' }}{{ getModifier(finalScores.charisma) }})
                </span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Point Buy Controls -->
              <div v-if="localData.method === 'pointbuy'" class="flex items-center space-x-1">
                <button
                  type="button"
                  @click="adjustScore('charisma', -1)"
                  :disabled="(localData.charisma || 8) <= 8"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-12 text-center text-sm font-medium">
                  {{ localData.charisma || 8 }}
                </div>
                <button
                  type="button"
                  @click="adjustScore('charisma', 1)"
                  :disabled="(localData.charisma || 8) >= 15 || (localData.pointsRemaining || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
              
              <!-- Dropdown (Standard Array and Roll) -->
              <div v-else-if="localData.method === 'standard' || (localData.method === 'roll' && localData.availableScores && localData.availableScores.length > 0)" class="flex-1">
                <MobileSelect
                  :model-value="localData.charisma || null"
                  :options="availableAbilityScores"
                  placeholder="Choose score..."
                  value-key="value"
                  label-key="label"
                  @update:model-value="(value) => handleAbilitySelection('charisma', value)"
                />
              </div>
              
              <!-- Roll Input (manual entry fallback) -->
              <input
                v-else
                v-model.number="localData.charisma"
                type="number"
                min="3"
                max="18"
                class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                @input="updateAbilities"
                :placeholder="localData.method === 'roll' ? 'Roll scores first' : ''"
                :disabled="localData.method === 'roll' && (!localData.availableScores || localData.availableScores.length === 0)"
              />
              
              <div v-if="getBackgroundBonus('charisma')" class="text-sm text-blue-600 font-medium">
                +{{ getBackgroundBonus('charisma') }}
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Base: {{ localData.method === 'standard' ? (localData.charisma || '—') : (localData.charisma || '—') }}{{ getBackgroundBonus('charisma') ? ` + ${getBackgroundBonus('charisma')} (bg)` : '' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Points Remaining (Point Buy) -->
      <div v-if="localData.method === 'pointbuy'" class="mt-4 p-4 bg-blue-50 rounded-lg">
        <div class="text-sm text-blue-800">
          Points Remaining: {{ localData.pointsRemaining ?? 27 }}
        </div>
      </div>

      <!-- Background Ability Score Selection (D&D 2024: 3 points to distribute) -->
      <div v-if="backgroundAbilityChoices.length > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h3 class="text-lg font-semibold text-blue-900 mb-3">Background Ability Score Bonuses</h3>
        <p class="text-blue-800 text-sm mb-4">
          Your {{ props.originData?.background?.name }} background gives you 3 points to distribute among: 
          {{ backgroundAbilityChoices.map(choice => choice.charAt(0).toUpperCase() + choice.slice(1)).join(', ') }}
        </p>
        <p class="text-blue-700 text-xs mb-4">
          You can distribute these 3 points however you want, but no single ability can receive more than +2.
        </p>
        
        <div class="space-y-3">
          <div class="flex items-center justify-between text-sm font-medium text-blue-900 mb-2">
            <span>Points remaining: {{ backgroundPointsRemaining }}</span>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div 
              v-for="ability in backgroundAbilityChoices" 
              :key="ability" 
              class="flex items-center justify-between p-3 bg-white rounded border"
            >
              <label class="text-sm font-medium text-gray-700 capitalize">
                {{ ability }}
              </label>
              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  @click="adjustBackgroundBonus(ability, -1)"
                  :disabled="(localData.backgroundChoice?.[ability as keyof BackgroundAbilityChoice] || 0) <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  −
                </button>
                <div class="w-8 text-center text-sm font-bold text-blue-900">
                  +{{ localData.backgroundChoice?.[ability as keyof BackgroundAbilityChoice] || 0 }}
                </div>
                <button
                  type="button"
                  @click="adjustBackgroundBonus(ability, 1)"
                  :disabled="(localData.backgroundChoice?.[ability as keyof BackgroundAbilityChoice] || 0) >= 2 || backgroundPointsRemaining <= 0"
                  class="w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { AbilityScores, OriginSelection, BackgroundAbilityChoice } from '../../../types/character-creation.mjs';
import Icon from '../../common/Icon.vue';
import MobileSelect from '../../common/MobileSelect.vue';

// Props
interface Props {
  modelValue: AbilityScores | null;
  originData?: OriginSelection | null;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'update:modelValue', value: AbilityScores): void;
  (e: 'validate'): void;
  (e: 'next'): void;
  (e: 'back'): void;
}

const emit = defineEmits<Emits>();

// Local reactive data
const localData = ref<Partial<AbilityScores>>({
  method: props.modelValue?.method || 'standard',
  pointsRemaining: props.modelValue?.pointsRemaining || 27,
  availableScores: props.modelValue?.availableScores || [15, 14, 13, 12, 10, 8],
  strength: props.modelValue?.strength,
  dexterity: props.modelValue?.dexterity,
  constitution: props.modelValue?.constitution,
  intelligence: props.modelValue?.intelligence,
  wisdom: props.modelValue?.wisdom,
  charisma: props.modelValue?.charisma,
  backgroundChoice: props.modelValue?.backgroundChoice || {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0
  }
});

// Dice rolling state
const rollingInProgress = ref(false);
const lastRollDetails = ref<Array<{ability: string, rolls: number[], result: number}>>([]);

// Computed
const backgroundAbilityChoices = computed(() => {
  // Debug: Log the background data structure
  console.log('Debug - originData:', props.originData);
  console.log('Debug - background:', props.originData?.background);
  
  // The background is now the full DndBackgroundDocument from the parent component
  if (props.originData?.background && 
      typeof props.originData.background === 'object') {
    
    // Check for the direct pluginData.abilityScores (DndBackgroundDocument structure)
    if ('pluginData' in props.originData.background) {
      const pluginData = props.originData.background.pluginData as any;
      if (pluginData?.abilityScores && Array.isArray(pluginData.abilityScores)) {
        console.log('Debug - Found abilityScores in pluginData:', pluginData.abilityScores);
        return pluginData.abilityScores as string[];
      }
    }
  }
  
  console.log('Debug - No background ability scores found');
  return [];
});


// Background points system (D&D 2024: 3 points total)
const backgroundPointsRemaining = computed(() => {
  if (!localData.value.backgroundChoice) return 3;
  
  const totalUsed = (localData.value.backgroundChoice.strength || 0) +
                   (localData.value.backgroundChoice.dexterity || 0) +
                   (localData.value.backgroundChoice.constitution || 0) +
                   (localData.value.backgroundChoice.intelligence || 0) +
                   (localData.value.backgroundChoice.wisdom || 0) +
                   (localData.value.backgroundChoice.charisma || 0);
  
  return 3 - totalUsed;
});

// Unified ability score options (works for both standard array and roll methods)
const availableAbilityScores = computed(() => {
  // Determine source scores based on method
  let sourceScores: number[];
  if (localData.value.method === 'standard') {
    sourceScores = [15, 14, 13, 12, 10, 8];
  } else if (localData.value.method === 'roll') {
    if (!localData.value.availableScores || localData.value.availableScores.length === 0) {
      return [];
    }
    sourceScores = localData.value.availableScores;
  } else {
    return [];
  }
  
  // Get currently assigned scores
  const assignedScores = [
    localData.value.strength,
    localData.value.dexterity,
    localData.value.constitution,
    localData.value.intelligence,
    localData.value.wisdom,
    localData.value.charisma
  ].filter(score => score !== undefined && score !== null) as number[];
  
  // Filter out already assigned scores
  const availableScores = sourceScores.filter(score => !assignedScores.includes(score));
  
  return availableScores.map(score => ({
    value: score,
    label: score.toString()
  }));
});

// Calculate ability modifier from score
const getModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

// Calculate final scores with background bonuses
const finalScores = computed(() => {
  const base = localData.value;
  const bg = localData.value.backgroundChoice;
  
  // For standard array and roll method, use actual score or show placeholder
  const getBaseScore = (score: number | undefined): number => {
    if (score === undefined) {
      return 0; // Return 0 for undefined scores, display logic will handle showing "--"
    }
    if (localData.value.method === 'pointbuy' && score === undefined) {
      return 8; // Default 8 for point buy when undefined
    }
    return score;
  };
  
  return {
    strength: getBaseScore(base.strength) + (bg?.strength || 0),
    dexterity: getBaseScore(base.dexterity) + (bg?.dexterity || 0),
    constitution: getBaseScore(base.constitution) + (bg?.constitution || 0),
    intelligence: getBaseScore(base.intelligence) + (bg?.intelligence || 0),
    wisdom: getBaseScore(base.wisdom) + (bg?.wisdom || 0),
    charisma: getBaseScore(base.charisma) + (bg?.charisma || 0)
  };
});

const isValid = computed(() => {
  const hasMethod = !!localData.value.method;
  
  let hasScores = false;
  if (localData.value.method === 'standard' || localData.value.method === 'roll') {
    // For standard array and roll method, all scores must be assigned (not undefined)
    hasScores = localData.value.strength !== undefined &&
                localData.value.dexterity !== undefined &&
                localData.value.constitution !== undefined &&
                localData.value.intelligence !== undefined &&
                localData.value.wisdom !== undefined &&
                localData.value.charisma !== undefined;
  } else {
    // For point buy, scores should be defined (even if 0)
    hasScores = localData.value.strength !== undefined &&
                localData.value.dexterity !== undefined &&
                localData.value.constitution !== undefined &&
                localData.value.intelligence !== undefined &&
                localData.value.wisdom !== undefined &&
                localData.value.charisma !== undefined;
  }
  
  // Must have background choices if background provides them (all 3 points distributed)
  const hasBackgroundChoices = backgroundAbilityChoices.value.length === 0 ||
                               backgroundPointsRemaining.value === 0;
  
  return hasMethod && hasScores && hasBackgroundChoices;
});

// Methods
const getBackgroundBonus = (ability: string): number => {
  const bg = localData.value.backgroundChoice;
  if (!bg) return 0;
  return (bg as any)[ability] || 0;
};

const adjustBackgroundBonus = (ability: string, change: number) => {
  if (!localData.value.backgroundChoice) return;
  
  const currentBonus = (localData.value.backgroundChoice as any)[ability] || 0;
  const newBonus = Math.max(0, Math.min(2, currentBonus + change));
  
  // Only allow the change if we have points remaining (for increases) or if we're decreasing
  if (change > 0 && backgroundPointsRemaining.value <= 0) return;
  
  (localData.value.backgroundChoice as any)[ability] = newBonus;
  updateAbilities();
};

const adjustScore = (ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma', change: number) => {
  const currentScore = localData.value[ability] || 8;
  const newScore = Math.max(8, Math.min(15, currentScore + change));
  
  // Only adjust if we have enough points (for increases) or if we're decreasing
  if (change > 0) {
    const costDifference = getPointCost(newScore) - getPointCost(currentScore);
    if (costDifference <= (localData.value.pointsRemaining || 0)) {
      localData.value[ability] = newScore;
    }
  } else {
    localData.value[ability] = newScore;
  }
  
  updateAbilities();
};

// Clear ability scores when switching methods
const clearScoresForMethod = () => {
  const newData = { ...localData.value };
  newData.strength = undefined;
  newData.dexterity = undefined;
  newData.constitution = undefined;
  newData.intelligence = undefined;
  newData.wisdom = undefined;
  newData.charisma = undefined;
  localData.value = newData;
};

// Unified ability selection handler (works for both standard array and roll methods)
const handleAbilitySelection = (ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma', value: string | number | null) => {
  const score = typeof value === 'string' ? parseInt(value) : value;
  
  console.log('Ability selection:', { method: localData.value.method, ability, value, score });
  
  // Create a new object to trigger reactivity
  const newData = { ...localData.value };
  
  // If we're reassigning a score that was previously used elsewhere, we need to clear that other assignment first
  if (score !== null && score !== undefined) {
    const abilities: Array<'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'> = 
      ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    
    // Find any other ability that has this same score and clear it
    abilities.forEach(otherAbility => {
      if (otherAbility !== ability && newData[otherAbility] === score) {
        newData[otherAbility] = undefined;
      }
    });
  }
  
  // Assign the new score
  newData[ability] = score !== null && score !== undefined ? score : undefined;
  
  // Update the reactive reference
  localData.value = newData;
  
  console.log('After assignment:', { method: localData.value.method, ability, score, localData: localData.value });
  updateAbilities();
};

// Point buy cost calculation (D&D 2024 rules)
const getPointCost = (score: number): number => {
  if (score <= 8) return 0;
  if (score <= 13) return score - 8; // 9=1, 10=2, 11=3, 12=4, 13=5
  if (score <= 15) return 5 + (score - 13) * 2; // 14=7, 15=9
  return 9; // Max at 15
};

const getTotalPointsSpent = (): number => {
  return getPointCost(localData.value.strength || 8) +
         getPointCost(localData.value.dexterity || 8) +
         getPointCost(localData.value.constitution || 8) +
         getPointCost(localData.value.intelligence || 8) +
         getPointCost(localData.value.wisdom || 8) +
         getPointCost(localData.value.charisma || 8);
};

const updateAbilities = () => {
  // Set default values based on method
  if (localData.value.method === 'standard') {
    localData.value.availableScores = [15, 14, 13, 12, 10, 8];
    localData.value.pointsRemaining = 0;
    
    // Don't clear scores - let them persist for standard array
  } else if (localData.value.method === 'pointbuy') {
    localData.value.availableScores = [];
    
    // For point buy, start all scores at 8 if not set
    if (localData.value.strength === undefined) localData.value.strength = 8;
    if (localData.value.dexterity === undefined) localData.value.dexterity = 8;
    if (localData.value.constitution === undefined) localData.value.constitution = 8;
    if (localData.value.intelligence === undefined) localData.value.intelligence = 8;
    if (localData.value.wisdom === undefined) localData.value.wisdom = 8;
    if (localData.value.charisma === undefined) localData.value.charisma = 8;
    
    // Calculate points remaining
    localData.value.pointsRemaining = 27 - getTotalPointsSpent();
  } else if (localData.value.method === 'roll') {
    // Initialize availableScores if not already set
    if (!localData.value.availableScores) {
      localData.value.availableScores = [];
    }
    localData.value.pointsRemaining = 0;
    
    // Don't clear scores - let them persist for roll method like standard array
    // Don't auto-roll - let user click the button
  }

  if (isValid.value) {
    emit('update:modelValue', localData.value as AbilityScores);
  }
  
  emit('validate');
};

// Dice rolling methods
const rollD6 = (): number => {
  return Math.floor(Math.random() * 6) + 1;
};

const roll4d6DropLowest = (): {rolls: number[], result: number} => {
  const rolls = [rollD6(), rollD6(), rollD6(), rollD6()];
  rolls.sort((a, b) => b - a); // Sort descending
  const result = rolls[0] + rolls[1] + rolls[2]; // Take top 3
  return { rolls, result };
};

const rollAllAbilities = async () => {
  rollingInProgress.value = true;
  lastRollDetails.value = [];
  
  // Clear any previously assigned scores when rolling new ones
  localData.value.strength = undefined;
  localData.value.dexterity = undefined;
  localData.value.constitution = undefined;
  localData.value.intelligence = undefined;
  localData.value.wisdom = undefined;
  localData.value.charisma = undefined;
  
  // Generate 6 rolled scores
  const rolledScores: number[] = [];
  
  // Roll 6 times with a slight delay for dramatic effect
  for (let i = 0; i < 6; i++) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const rollResult = roll4d6DropLowest();
    rolledScores.push(rollResult.result);
    
    lastRollDetails.value.push({
      ability: `Roll ${i + 1}`,
      rolls: rollResult.rolls,
      result: rollResult.result
    });
  }
  
  // Sort scores in descending order for better display
  rolledScores.sort((a, b) => b - a);
  
  // Store the available scores for dropdown assignment
  localData.value.availableScores = rolledScores;
  
  rollingInProgress.value = false;
  updateAbilities();
};

const formatRollDetails = (): string => {
  return lastRollDetails.value.map(detail => 
    `${detail.ability}: [${detail.rolls.join(', ')}] = ${detail.result}`
  ).join(' | ');
};

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    localData.value = { ...newValue };
  }
}, { deep: true });

// Initialize with default values
if (!props.modelValue) {
  updateAbilities();
}

// Watch for background ability choices changes and initialize backgroundChoice properly
watch(() => backgroundAbilityChoices.value, (newChoices) => {
  if (newChoices.length > 0 && !localData.value.backgroundChoice) {
    // Initialize background choice with all abilities at 0
    localData.value.backgroundChoice = {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0
    };
    updateAbilities();
  }
}, { immediate: true });
</script>

<style scoped>
.ability-scores-step {
  @apply space-y-6;
}

.step-header h2 {
  @apply text-2xl font-bold text-gray-900;
}

.step-header p {
  @apply text-gray-600 mt-2;
}

.ability-score-card {
  @apply transition-colors;
}

.ability-score-card:hover {
  @apply bg-gray-50;
}

/* Mobile-responsive grid adjustments */
@media (max-width: 768px) {
  .grid.lg\\:grid-cols-3 {
    @apply grid-cols-1;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .grid.lg\\:grid-cols-3 {
    @apply grid-cols-2;
  }
}

/* Enhanced focus states for accessibility */
input[type="number"]:focus {
  @apply ring-2 ring-blue-500 ring-offset-2;
}

/* Better radio button styling */
input[type="radio"] {
  @apply w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500;
}

@media (max-width: 640px) {
  input[type="radio"] {
    @apply w-5 h-5;
  }
}
</style>