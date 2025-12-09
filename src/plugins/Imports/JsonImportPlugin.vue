<template>
    <v-btn color='primary' @click='dialog = true'>Import REQIF</v-btn>
    <v-dialog v-model='dialog'>
        <v-card class=w-50>
            <v-card-title>Select Import Elements</v-card-title>
            <v-card-actions>
                <v-file-input
                    v-model='selectedFiles'
                    accept='.reqif'
                    label='REQIF Input'
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
import { reqif2pig } from '../../utils/import/ReqIF/reqif2pig';

@Options({
  data() {
    return {
        dialog: false,
        selectedFiles: []
    };
  },
  methods: {
    submitFiles() {
        const ReqifTranslator = new reqif2pig();
        let translatorResponse = ReqifTranslator.toPig(this.selectedFiles);
        console.log(translatorResponse.ok);
        console.log(translatorResponse.status);

        // reset variables
        this.dialog = false;
        this.selectedFiles = [];
    }
  },
})

export default class JsonImportComponent extends Vue {}
</script>

<style scoped></style>