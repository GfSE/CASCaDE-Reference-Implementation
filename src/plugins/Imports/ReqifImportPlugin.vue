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
                <v-btn color='blue' @click='submitFiles'>Submit</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
    import { Options, Vue } from 'vue-class-component';
    import { importReqif } from '../../utils/import/ReqIF/import-reqif';
    import { PIN } from '../../utils/lib/platform-independence';

    @Options({
        data() {
            return {
                dialog: false,
                selectedFiles: []
            };
        },
        methods: {
            async submitFiles() {
                for (const file of this.selectedFiles) {
                    const readResponse = await PIN.readFileAsText(file)
                    const rspContent = readResponse.response
                    const importResponse = await importReqif(rspContent.response, file)
                    if (importResponse.ok) {
                        // handle successful import, e.g., store the PIG items and update the UI
                        const importPackage = importResponse.response
                        console.log(typeof importPackage)
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
