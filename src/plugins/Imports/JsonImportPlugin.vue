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
                    multiple
                ></v-file-input>
                <v-btn color='red' @click='dialog = false'>Close</v-btn>
                <v-btn color='blue' @click='onClick'>Submit</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import { importJSONLD } from '../../utils/import/jsonld/import-package-jsonld';
import { TPigItem, APackage, stringHTML } from '../../utils/schemas/pig/ts/pig-metaclasses';
import { useHtmlStore } from '@/stores/cacheStore' 

@Options({
  data() {
    return {
        dialog: false,
        selectedFiles: []
    };
  },
  methods: {
    async onClick() {
        const store = useHtmlStore()

        const htmlArray = await this.submitFiles()
        console.log(htmlArray)
        store.htmlArray = htmlArray

        await this.$router.push({
            name: "Viewing"
        })
    },
    async submitFiles() {
        for (const file of this.selectedFiles) {
            // extract HTML of object
            const translatorResponse = await importJSONLD(file);
            if (translatorResponse.ok) {
                // handle successful import, e.g., store the PIG items and update the UI
                const allItems = translatorResponse.response as TPigItem[];
                const thePackage = allItems[0] as APackage;
                
                // TODO: this will only return the first file, need to update to return list of all HTML
                const htmlArray = thePackage.getHTML() as stringHTML[]
                return htmlArray
            } else {
                // handle import error, e.g., log/show an error message
            }
        }
    }
  },
})

export default class JsonImportComponent extends Vue {}
</script>

<style scoped></style>
