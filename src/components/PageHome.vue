<template>
    <div class="pageHome">
        <p>
            <a href="https://cascara.gfse.org" target="_blank">CASCaRA</a> (formerly CASCaDE) is an initiative
            under <a href="https://www.omg.org/" target="_blank">OMG</a> to facilitate collaboration
            in the mechatronic product lifecycle through a standardized data format and ontology.
        </p>
        <p>
            This is the CASCaRA Reference Implementation. It is designed to
            validate the concepts of the upcoming CASCaRA Standard using real-world data and to
            provide a common foundation for enterprise software, ensuring interoperability through
            standardized data formats and transformations.
        </p>

        <!-- Mounted Plugins -->
        <section>
            <h3>Import Plugins</h3>
            <ul>
                <li v-for="(component, name) in importComponents" :key="name">
                    {{ name }}
                </li>
            </ul>
            <!--
        <h3>Export Plugins</h3>
        <ul>
            <li v-for="(component, name) in exportComponents" :key="name">
                {{ name }}
            </li>
        </ul>  -->
        </section>

        <!-- Build Information Table -->
        <section class="boxInfo">
            <h3>Build Information</h3>
            <dl class="info-table">
                <dt>Version</dt>
                <dd>{{ DEF.appVersion }}</dd>

                <dt>Build Time</dt>
                <dd>{{ DEF.buildTime }}</dd>

                <dt>Branch</dt>
                <dd>{{ DEF.gitBranch }}</dd>
            </dl>
        </section>

        <!-- Report Issue Button
    <v-btn color="primary"
           class="mt-4"
           @click="openGithubIssue">
        Report an Issue
    </v-btn> -->
    </div>
</template>

<script lang="ts">
    import { inject } from 'vue';
    import { Options, Vue } from 'vue-class-component';
    import { DEF } from '@/common/lib/definitions';

    @Options({
        name: 'PageHome',
    //    inject: ['globalComponents'],
        computed: {
            DEF() { return DEF; },
            importComponents() { return inject('importComponents', {}); },
            exportComponents() { return inject('exportComponents', {}); }
    /*    },
        methods: {
            openGithubIssue() {
                // Repo-URL: https://github.com/GfSE/CASCaDE-Reference-Implementation/issues/new
                window.open('https://github.com/GfSE/CASCaDE-Reference-Implementation/issues/new', '_blank')
            } */
        }
    })

    export default class PageHome extends Vue { }
</script>


<style scoped>
    h3 {
        margin-top: 1.6rem;
        margin-bottom: 0.4rem;
        text-align: center;
    }

    p {
        margin-top: 0.8rem;
        margin-bottom: 0.4rem;
        line-height: 1.6;
        text-align: center;
    }

    ul {
        list-style-type: none;
        padding: 0;
        text-align: center;
    }

    li {
        display: inline-block;
        margin: 0 10px;
    }

    .pageHome {
        max-width: 800px;
        margin: 0 auto;
        padding: 4rem 2rem 2rem;
    }
    /* Build Information Styling */
    .boxInfo {
        margin: 2rem auto;
        padding: 0 0 1.6rem;
        background-color: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #dee2e6;
        max-width: 400px;
    }
</style>
