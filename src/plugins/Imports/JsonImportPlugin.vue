<template>
    <v-btn color='primary' @click='dialog = true'>Import JSON-LD</v-btn>
    <v-dialog v-model='dialog'>
        <v-card class='w-50'>
            <v-card-title>Select Import Files</v-card-title>
            <v-card-actions>
                <v-file-input
                    v-model='selectedFiles'
                    accept='.jsonld'
                    label='JSON-LD Input'
                    prepend-icon='mdi-folder-open'
                    multiple
                ></v-file-input>
                <v-btn color='red' @click='dialog = false'>Close</v-btn>
                <v-btn color='blue' @click='submitFiles'>Submit</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
// import { jsonld2pig } from '../../utils/import/jsonld/jsonld2pig';

@Options({
  data() {
    return {
        dialog: false,
        selectedFiles: []
    };
  },
  methods: {
    submitFiles() {
/*
        const JsonldTranslator = new jsonld2pig();
        let translatorResponse = JsonldTranslator.toPig(this.selectedFiles);
        console.log(translatorResponse.ok);
        console.log(translatorResponse.status);

        // reset variables
        this.dialog = false;
        this.selectedFiles = [];
*/
    }
  },
})

export default class JsonImportComponent extends Vue {}
</script>

<style scoped></style>
