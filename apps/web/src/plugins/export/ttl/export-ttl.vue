<template>
    <v-btn color='secondary' @click='dialog = true'>Export RDF</v-btn>
    <v-dialog v-model='dialog'>
        <v-card>
            <v-card-title>Select Export Elements</v-card-title>
            <v-card-text>TBD...</v-card-text>
            <v-card-actions>
                <v-btn color='red' @click='dialog = false'>Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({
  data() {
    return {
        dialog: false
    }
  }
})

export default class RdfExportComponent extends Vue {}
</script>

<style scoped></style>