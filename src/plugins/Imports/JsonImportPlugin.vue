<template>
    <v-btn color='primary' @click='dialog = true'>Import JSON-LD</v-btn>
    <v-dialog v-model='dialog'>
        <v-card class='w-50'>
            <v-card-title>Select Import Files</v-card-title>
            <v-card-actions>
                <v-file-input
                    v-model='selectedFiles'
                    accept='.json,.jsonld,application/ld+json'
                    label='JSON-LD Input'
                    prepend-icon='mdi-folder-open'
                ></v-file-input>
                <v-btn color='red' @click='dialog = false'>Close</v-btn>
                <v-btn color='blue' @click='submitFiles'>Submit</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { markRaw, toRaw } from 'vue'
import { Options, Vue } from 'vue-class-component';
import { importJSONLD } from '../../utils/import/jsonld/import-jsonld';
import { TPigItem } from '../../utils/schemas/pig/pig-metaclasses';

@Options({
  data() {
    return {
        dialog: false,
        selectedFiles: []
    };
  },
  methods: {
    async submitFiles() {
        // need to make sure we implement injestion of multiple files later
        const rawFiles = toRaw(this.selectedFiles) as File;
        // const files: File = rawFiles.map(f => markRaw(f));
        const translatorResponse = await importJSONLD(rawFiles);
        const allItems = translatorResponse.response as TPigItem[];
        console.log(allItems);

        // reset variables
        this.dialog = false;
        this.selectedFiles = [];
    }
  },
})

export default class JsonImportComponent extends Vue {}
</script>

<style scoped></style>
