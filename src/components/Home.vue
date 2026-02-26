<template>
    <div class="Home Page">
        <h1>{{ msg }}</h1>
        <p>
            Perform simple import and export functions for verification and validation of the PIG Metamodel using (near to) real-world examples.
        </p>
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

        <ul>
            <li v-for="(component, name) in globalComponents" :key="name">
                <component :is="name" />
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
    import { inject } from 'vue';
    import { Options, Vue } from 'vue-class-component';
    import { DEF } from '@/utils/lib/definitions';

    @Options({
        props: {
            msg: String
        },
        inject: ['globalComponents'],
        computed: {
            DEF() {
                return DEF;
            }
        }
    })

    export default class Home extends Vue { }
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
    }

    ul {
        list-style-type: none;
        padding: 0;
    }

    li {
        display: inline-block;
        margin: 0 10px;
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
