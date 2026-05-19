<template>
    <v-container fluid>
        <v-row>
            <!-- Import Column -->
            <v-col cols="4">
                <v-sheet border="dashed md"
                         color="surface-light"
                         height="300"
                         rounded="lg">
                    <h2 class="column-title">Import from file</h2>
                    <ul>
                        <li v-for="(component, name) in importComponents" :key="name">
                            <component :is="component" />
                        </li>
                    </ul>
                </v-sheet>
            </v-col>

            <!-- Load Column -->
            <v-col cols="4">
                <v-sheet border="dashed md"
                         color="surface-light"
                         height="300"
                         rounded="lg">
                    <h2 class="column-title">Load from database</h2>
                    <div style="text-align: center;"><p><i>List of projects available in a database<br/>(in preparation)</i></p></div>
                </v-sheet>
            </v-col>

            <!-- Export Column -->
            <v-col cols="4">
                <v-sheet border="dashed md"
                         color="surface-light"
                         height="300"
                         rounded="lg">
                    <h2 class="column-title">Export to file</h2>
                    <ul>
                        <li v-for="(component, name) in exportComponents" :key="name">
                            <component :is="component" />
                        </li>
                    </ul>
                </v-sheet>
            </v-col>
        </v-row>
    </v-container>
</template>

<script lang="ts">
    import { Options, Vue } from 'vue-class-component';
    import { inject } from 'vue';

    @Options({
        name: 'PageInterfaces',
        inject: ['importComponents', 'exportComponents']
    })

    export default class PageInterfaces extends Vue { }
</script>

<style scoped>
    .column-title {
        text-align: center;
        padding: 15px 0;
        margin: 0;
        font-size: 1.25rem;
    }

    ul {
        display: flex;
        flex-direction: column;
        align-items: center;
        list-style: none;
        padding: 0;
        margin: 10px 20px;
    }

    li {
        margin-bottom: 10px;
    }
</style>
