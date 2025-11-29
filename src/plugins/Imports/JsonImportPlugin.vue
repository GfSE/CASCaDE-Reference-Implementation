<template>
    <v-btn color='primary' @click='dialog = true'>Import JSON</v-btn>
    <v-dialog v-model='dialog'>
        <v-card class='w-50'>
            <v-card-title>Select Import Elements</v-card-title>
            <v-card-actions>
                <v-file-input
                    accept='.json'
                    label='JSON Input'
                    prepend-icon='mdi-folder-open'
                    multiple
                ></v-file-input>
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

export default class JsonImportComponent extends Vue {}
</script>

<style scoped></style>