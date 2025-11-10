<template>
  <div class="text-center">
    <h1>Executive Dashboard</h1>

    <ul>
        <li>
            <v-progress-circular
              :model-value="20"
              :rotate="360"
              :size="100"
              :width="15"
              color="teal"
            >
              20%
            </v-progress-circular>
            <div>Requirements Verified</div>
        </li>
        <li>
            <v-progress-circular
              :model-value="55"
              :rotate="-90"
              :size="100"
              :width="15"
              color="primary"
            >
              55%
            </v-progress-circular>
            <div>Subsystem Integration</div>
        </li>
        <li>
            <v-progress-circular
              :model-value="37"
              :rotate="90"
              :size="100"
              :width="15"
              color="red"
            >
              37%
            </v-progress-circular>
            <div>Simulation Coverage</div>
        </li>
        <li>
            <v-progress-circular
              :model-value="89"
              :rotate="180"
              :size="100"
              :width="15"
              color="pink"
            >
              89%
            </v-progress-circular>
            <div>Compliance Status</div>
        </li>
        <li>
            <v-progress-circular
              :model-value="47"
              :rotate="180"
              :size="100"
              :width="15"
              color="cyan"
            >
              47%
            </v-progress-circular>
            <div>Open Changes Requests</div>
        </li>
    </ul>

    <div class="center-container">
        <v-sheet
              border="dashed md"
              color="surface-light"
              height="100%"
              rounded="lg"
              width="80%"
            >
            <h1>Digital Thread Traceability Coverage</h1>
            <v-progress-linear color="primary" model-value="20" :height="30" >20%</v-progress-linear>

            <h1>Change Requests This Week</h1>
            <v-progress-linear color="primary" model-value="39" :height="30" >39 Requests</v-progress-linear>

            <h1>Risk Indicators</h1>
            <ul>
                <li>
                    <v-progress-circular
                      :model-value="25"
                      :rotate="180"
                      :size="300"
                      :width="75"
                      color="green"
                    >
                      <h2>Low</h2>
                    </v-progress-circular>
                    <div>Schedule Risk</div>
                </li>
                <li>
                    <v-progress-circular
                      :model-value="50"
                      :rotate="180"
                      :size="300"
                      :width="75"
                      color="yellow"
                    >
                      <h2>Moderate</h2>
                    </v-progress-circular>
                    <div>Cost Risk</div>
                </li>
                <li>
                    <v-progress-circular
                      :model-value="75"
                      :rotate="180"
                      :size="300"
                      :width="75"
                      color="orange"
                    >
                      <h2>High</h2>
                    </v-progress-circular>
                    <div>Compliance Risk</div>
                </li>
                <li>
                    <v-progress-circular
                      :model-value="100"
                      :rotate="180"
                      :size="300"
                      :width="75"
                      color="red"
                    >
                      <h2>Critical</h2>
                    </v-progress-circular>
                    <div>Misc. Risk</div>
                </li>
            </ul>
        </v-sheet>
    </div>

  </div>
</template>


<script>
  import { Options, Vue } from 'vue-class-component';

  export default class Dashboards extends Vue {}
</script>


<style scoped>
    ul {
        display: flex;
        list-style: none;
        padding: 0;
        margin: 25px 0;
        justify-content: center;
    }

    li {
        margin-right: 20px;
        display: inline-block
    }

    .center-container {
        display: flex;
        justify-content: center;
    }

    h1 {
        margin-top: 50px;
        margin-bottom: 10px;
    }
</style>
