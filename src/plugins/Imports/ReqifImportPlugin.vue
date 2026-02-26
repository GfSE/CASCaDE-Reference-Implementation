<template>
    <v-btn color='primary' @click='dialog = true'>Import ReqIF</v-btn>
    <v-dialog v-model='dialog'>
        <v-card class='w-50'>
            <v-card-title>Select Import Files</v-card-title>
            <v-card-actions>
                <v-file-input
                    v-model='selectedFiles'
                    accept='.reqif'
                    label='ReqIF Input'
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
    import { importReqif } from '../../utils/import/ReqIF/import-reqif';
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
                // LOG.debug(htmlArray)
                store.htmlArray = htmlArray

                await this.$router.push({
                    name: "Viewing"
                })
            },
            async submitFiles() {
                for (const file of this.selectedFiles) {
                    const rsp = await importReqif(file)
                    if (rsp.ok) {
                        // handle successful import, e.g., store the PIG items and update the UI
                        const allItems = rsp.response as TPigItem[];
                        const thePackage = allItems[0] as APackage;

                        // TODO: this will only return the first file, need to update to return list of all HTML
                        const htmlArray = thePackage.getHTML() as stringHTML[]
                        return htmlArray
                    } else {
                        // handle import error, e.g., log/show an error message
                    }
                }

                // reset variables
                this.dialog = false;
                this.selectedFiles = [];
            }
        }
    })

    export default class ReqifImportComponent extends Vue { }
</script>

<style scoped></style>
