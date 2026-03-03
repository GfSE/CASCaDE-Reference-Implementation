<template>
    <div class="HomePage">
        <p>
            Perform simple import and export functions for verification and validation of the PIG Metamodel using (near to) real-world examples.
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
        <section class="build-info">
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
    </div>
</template>

<script lang="ts">
    import { inject } from 'vue';
    import { Options, Vue } from 'vue-class-component';
    import { DEF } from '@/common-code/lib/definitions';

    @Options({
        name: 'PageHome',
    //    inject: ['globalComponents'],
        computed: {
            DEF() { return DEF; },
            importComponents() { return inject('importComponents', {}); },
            exportComponents() { return inject('exportComponents', {}); }
        }
    })

    export default class PageHome extends Vue { }
</script>


<style scoped>
    h3 {
        margin-top: 0.8rem;
        margin-bottom: 0.4rem;
        text-align: center;
    }

    p {
        margin-bottom: 2rem;
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

    .HomePage {
        max-width: 800px;
        margin: 0 auto;
        padding: 4rem 2rem 2rem;
    }
    /* Build Information Styling */
    .build-info {
        margin: 2rem auto;
        padding: 1.5rem;
        background-color: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #dee2e6;
        max-width: 400px;
    }

    /* Definition List as Centered Table */
    .info-table {
        display: grid;
        grid-template-columns: auto auto;
        gap: 0.75rem 1.5rem;
        margin: 0 auto;
        justify-content: center;
    }

        .info-table dt {
            font-weight: 400;
            color: #495057;
            text-align: right;
        }

        .info-table dd {
            margin: 0;
            color: #212529;
            text-align: left;
        }
</style>
