<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<!--
    FMI-to-CAS.xsl
    Transforms an FMI modelDescription.xml (FMI 2.0 or FMI 3.0) into a self-contained
    CASCaRA (CAS) package. The package embeds both:
      (a) a small 'fmi:' ontology layer (Entity/Relationship/Link/Property classes), and
      (b) the instance data extracted from the model description.

    Version tolerance: all element matching uses local-name() so the same stylesheet
    handles FMI 2.0 (ScalarVariable + typed child) and FMI 3.0 (typed variable elements).
    The mapping is driven by the FMI XSDs in /ref (fmi2-schema, fmi3-schema).

    Copyright 2025 GfSE (https://gfse.org) - License: Apache 2.0
-->
<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:cas="http://product-information-graph.org"
    xmlns:fmi="https://fmi-standard.org/ontology#"
    xmlns:dcterms="http://purl.org/dc/terms/"
    xmlns:skos="http://www.w3.org/2004/02/skos/core#"
    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    xmlns:sh="http://www.w3.org/ns/shacl#"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:owl="http://www.w3.org/2002/07/owl#">

    <xsl:output method="xml" encoding="UTF-8" indent="yes" standalone="yes"/>

    <!-- ============================================================= -->
    <!-- Global context                                                -->
    <!-- ============================================================= -->
    <xsl:variable name="md" select="/*[local-name()='fmiModelDescription']"/>
    <xsl:variable name="fmiVersion" select="string($md/@fmiVersion)"/>
    <xsl:variable name="isFmi3" select="starts-with($fmiVersion, '3')"/>

    <!-- All variable elements (FMI2: ScalarVariable; FMI3: Float64, Int32, ...) -->
    <xsl:variable name="vars" select="$md/*[local-name()='ModelVariables']/*"/>
    <!-- Unit / type-definition declarations -->
    <xsl:variable name="units" select="$md/*[local-name()='UnitDefinitions']/*[local-name()='Unit']"/>
    <xsl:variable name="types" select="$md/*[local-name()='TypeDefinitions']/*"/>
    <!-- Enumeration types are mapped to cas:Enumeration classes; all other types -->
    <!-- become fmi:TypeDefinition instances. FMI 2.0: SimpleType with an Enumeration -->
    <!-- child; FMI 3.0: EnumerationType element. -->
    <xsl:variable name="enumTypes" select="$types[local-name()='EnumerationType' or *[local-name()='Enumeration']]"/>
    <xsl:variable name="plainTypes" select="$types[not(local-name()='EnumerationType') and not(*[local-name()='Enumeration'])]"/>
    <!-- Interfaces (ModelExchange, CoSimulation, ScheduledExecution) -->
    <xsl:variable name="interfaces" select="$md/*[local-name()='ModelExchange' or local-name()='CoSimulation' or local-name()='ScheduledExecution']"/>
    <xsl:variable name="logcats" select="$md/*[local-name()='LogCategories']/*[local-name()='Category']"/>
    <xsl:variable name="experiment" select="$md/*[local-name()='DefaultExperiment']"/>

    <!-- A timestamp used for the mandatory dcterms:modified of every instance.    -->
    <!-- FMI has no per-element change info, so we reuse generationDateAndTime.     -->
    <xsl:variable name="modified">
        <xsl:choose>
            <xsl:when test="$md/@generationDateAndTime and string-length($md/@generationDateAndTime) &gt; 0">
                <xsl:value-of select="$md/@generationDateAndTime"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>1970-01-01T00:00:00Z</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:variable>

    <!-- ============================================================= -->
    <!-- Root template                                                 -->
    <!-- ============================================================= -->
    <xsl:template match="/">
        <cas:aPackage rdf:type="cas:Package">
            <xsl:attribute name="id">
                <xsl:text>fmi-package</xsl:text>
            </xsl:attribute>
            <dcterms:title>
                <xsl:choose>
                    <xsl:when test="$md/@modelName and string-length($md/@modelName) &gt; 0">
                        <xsl:text>FMU: </xsl:text>
                        <xsl:value-of select="$md/@modelName"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>Imported FMU</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </dcterms:title>
            <dcterms:description>
                <xsl:choose>
                    <xsl:when test="$md/@description and string-length($md/@description) &gt; 0">
                        <xsl:value-of select="$md/@description"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>Functional Mock-up Interface model (FMI </xsl:text>
                        <xsl:value-of select="$fmiVersion"/>
                        <xsl:text>)</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </dcterms:description>
            <dcterms:modified>
                <xsl:value-of select="$modified"/>
            </dcterms:modified>
            <graph>
                <xsl:call-template name="emit-ontology"/>
                <xsl:call-template name="emit-instances"/>
            </graph>
        </cas:aPackage>
    </xsl:template>

    <!-- ============================================================= -->
    <!-- SECTION 1: Ontology - Datatype Properties (cas:Property)      -->
    <!-- ============================================================= -->
    <xsl:template name="emit-property-class">
        <xsl:param name="id"/>
        <xsl:param name="title"/>
        <xsl:param name="datatype"/>
        <xsl:param name="definition"/>
        <cas:Property rdf:type="owl:DatatypeProperty" id="{$id}">
            <cas:specializes>cas:Property</cas:specializes>
            <dcterms:title>
                <xsl:value-of select="$title"/>
            </dcterms:title>
            <xsl:if test="$definition and string-length($definition) &gt; 0">
                <skos:definition>
                    <xsl:value-of select="$definition"/>
                </skos:definition>
            </xsl:if>
            <sh:datatype>
                <xsl:value-of select="$datatype"/>
            </sh:datatype>
        </cas:Property>
    </xsl:template>

    <xsl:template name="emit-ontology">
        <!-- FMU-level properties -->
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:fmiVersion'"/>
            <xsl:with-param name="title" select="'FMI version'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'The version of the FMI standard the FMU conforms to.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:guid'"/>
            <xsl:with-param name="title" select="'GUID / instantiation token'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'Fingerprint (FMI 2.0 guid / FMI 3.0 instantiationToken) verifying that the model description and the binary match.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:modelName'"/>
            <xsl:with-param name="title" select="'model name'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:author'"/>
            <xsl:with-param name="title" select="'author'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:version'"/>
            <xsl:with-param name="title" select="'FMU version'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:copyright'"/>
            <xsl:with-param name="title" select="'copyright'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:license'"/>
            <xsl:with-param name="title" select="'license'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:generationTool'"/>
            <xsl:with-param name="title" select="'generation tool'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:generationDateAndTime'"/>
            <xsl:with-param name="title" select="'generation date and time'"/>
            <xsl:with-param name="datatype" select="'xs:dateTime'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:variableNamingConvention'"/>
            <xsl:with-param name="title" select="'variable naming convention'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:numberOfEventIndicators'"/>
            <xsl:with-param name="title" select="'number of event indicators'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>

        <!-- Variable-level properties -->
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:valueReference'"/>
            <xsl:with-param name="title" select="'value reference'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
            <xsl:with-param name="definition" select="'Handle used to identify the variable value in FMI function calls.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:causality'"/>
            <xsl:with-param name="title" select="'causality'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'parameter, calculatedParameter, input, output, local, independent or structuralParameter.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:variability'"/>
            <xsl:with-param name="title" select="'variability'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'constant, fixed, tunable, discrete or continuous.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:initial'"/>
            <xsl:with-param name="title" select="'initial'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'exact, approx or calculated.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:dataType'"/>
            <xsl:with-param name="title" select="'data type'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'FMI base data type, e.g. Real/Integer/Boolean/String/Enumeration (FMI 2.0) or Float64/Int32/... (FMI 3.0).'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:start'"/>
            <xsl:with-param name="title" select="'start value'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:declaredType'"/>
            <xsl:with-param name="title" select="'declared type'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:unit'"/>
            <xsl:with-param name="title" select="'unit'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:displayUnit'"/>
            <xsl:with-param name="title" select="'display unit'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:quantity'"/>
            <xsl:with-param name="title" select="'quantity'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:min'"/>
            <xsl:with-param name="title" select="'minimum'"/>
            <xsl:with-param name="datatype" select="'xs:double'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:max'"/>
            <xsl:with-param name="title" select="'maximum'"/>
            <xsl:with-param name="datatype" select="'xs:double'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:nominal'"/>
            <xsl:with-param name="title" select="'nominal'"/>
            <xsl:with-param name="datatype" select="'xs:double'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:derivative'"/>
            <xsl:with-param name="title" select="'derivative of (index)'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>

        <!-- Additional variable / type-definition scalar attributes (Phase 1) -->
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:canHandleMultipleSetPerTimeInstant'"/>
            <xsl:with-param name="title" select="'can handle multiple set per time instant'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
            <xsl:with-param name="definition" select="'ModelExchange inputs only: if false, the input may not appear in an algebraic loop.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:reinit'"/>
            <xsl:with-param name="title" select="'reinit'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
            <xsl:with-param name="definition" select="'Continuous-time state (ModelExchange) that can be reinitialized at an event.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:relativeQuantity'"/>
            <xsl:with-param name="title" select="'relative quantity'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
            <xsl:with-param name="definition" select="'If true, the displayUnit offset is ignored when converting values.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:unbounded'"/>
            <xsl:with-param name="title" select="'unbounded'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
            <xsl:with-param name="definition" select="'Real variable whose value can grow without bound (e.g. crank angle).'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:clocks'"/>
            <xsl:with-param name="title" select="'clocks'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'FMI 3.0: space-separated value references of the clocks this variable is associated with.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:intermediateUpdate'"/>
            <xsl:with-param name="title" select="'intermediate update'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
            <xsl:with-param name="definition" select="'FMI 3.0: variable may be accessed during intermediate update.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:previous'"/>
            <xsl:with-param name="title" select="'previous (value reference)'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
            <xsl:with-param name="definition" select="'FMI 3.0: value reference of the variable holding the previous value of a clocked variable.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:mimeType'"/>
            <xsl:with-param name="title" select="'MIME type'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'FMI 3.0 Binary: MIME type of the binary data.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:maxSize'"/>
            <xsl:with-param name="title" select="'max size'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
            <xsl:with-param name="definition" select="'FMI 3.0 Binary: maximum size in bytes.'"/>
        </xsl:call-template>
        <!-- FMI 3.0 Clock variable / ClockType attributes -->
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:canBeDeactivated'"/>
            <xsl:with-param name="title" select="'can be deactivated'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:priority'"/>
            <xsl:with-param name="title" select="'priority'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:intervalVariability'"/>
            <xsl:with-param name="title" select="'interval variability'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:intervalDecimal'"/>
            <xsl:with-param name="title" select="'interval (decimal)'"/>
            <xsl:with-param name="datatype" select="'xs:double'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:shiftDecimal'"/>
            <xsl:with-param name="title" select="'shift (decimal)'"/>
            <xsl:with-param name="datatype" select="'xs:double'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:supportsFraction'"/>
            <xsl:with-param name="title" select="'supports fraction'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:resolution'"/>
            <xsl:with-param name="title" select="'resolution'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:intervalCounter'"/>
            <xsl:with-param name="title" select="'interval counter'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:shiftCounter'"/>
            <xsl:with-param name="title" select="'shift counter'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>

        <!-- Unit-level properties: one SI base-unit exponent per axis -->
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:exp_kg'"/>
            <xsl:with-param name="title" select="'SI exponent: kg (mass)'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
            <xsl:with-param name="definition" select="'Exponent of the SI base unit kilogram in this unit.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:exp_m'"/>
            <xsl:with-param name="title" select="'SI exponent: m (length)'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:exp_s'"/>
            <xsl:with-param name="title" select="'SI exponent: s (time)'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:exp_A'"/>
            <xsl:with-param name="title" select="'SI exponent: A (electric current)'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:exp_K'"/>
            <xsl:with-param name="title" select="'SI exponent: K (temperature)'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:exp_mol'"/>
            <xsl:with-param name="title" select="'SI exponent: mol (amount of substance)'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:exp_cd'"/>
            <xsl:with-param name="title" select="'SI exponent: cd (luminous intensity)'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:exp_rad'"/>
            <xsl:with-param name="title" select="'SI exponent: rad (angle)'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:factor'"/>
            <xsl:with-param name="title" select="'factor'"/>
            <xsl:with-param name="datatype" select="'xs:double'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:offset'"/>
            <xsl:with-param name="title" select="'offset'"/>
            <xsl:with-param name="datatype" select="'xs:double'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:inverse'"/>
            <xsl:with-param name="title" select="'inverse'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
            <xsl:with-param name="definition" select="'If true, the display value is computed as factor/value + offset (FMI 3.0 inverse display unit).'"/>
        </xsl:call-template>

        <!-- TypeDefinition-level properties -->
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:baseType'"/>
            <xsl:with-param name="title" select="'base type'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>

        <!-- Interface-level properties -->
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:interfaceType'"/>
            <xsl:with-param name="title" select="'interface type'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'ModelExchange, CoSimulation or ScheduledExecution.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:modelIdentifier'"/>
            <xsl:with-param name="title" select="'model identifier'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:needsExecutionTool'"/>
            <xsl:with-param name="title" select="'needs execution tool'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:canGetAndSetFMUstate'"/>
            <xsl:with-param name="title" select="'can get and set FMU state'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:canSerializeFMUstate'"/>
            <xsl:with-param name="title" select="'can serialize FMU state'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:providesDirectionalDerivative'"/>
            <xsl:with-param name="title" select="'provides directional derivatives'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:canHandleVariableCommunicationStepSize'"/>
            <xsl:with-param name="title" select="'can handle variable communication step size'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:maxOutputDerivativeOrder'"/>
            <xsl:with-param name="title" select="'max output derivative order'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>

        <!-- Additional interface capability flags (Phase 1) -->
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:completedIntegratorStepNotNeeded'"/>
            <xsl:with-param name="title" select="'completed integrator step not needed'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:canBeInstantiatedOnlyOncePerProcess'"/>
            <xsl:with-param name="title" select="'can be instantiated only once per process'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:canNotUseMemoryManagementFunctions'"/>
            <xsl:with-param name="title" select="'cannot use memory management functions'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:canInterpolateInputs'"/>
            <xsl:with-param name="title" select="'can interpolate inputs'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:canRunAsynchronuously'"/>
            <xsl:with-param name="title" select="'can run asynchronously'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
            <xsl:with-param name="definition" select="'FMI 2.0 Co-Simulation capability flag (spelled canRunAsynchronuously in the FMI 2.0 schema).'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:providesAdjointDerivatives'"/>
            <xsl:with-param name="title" select="'provides adjoint derivatives'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:providesPerElementDependencies'"/>
            <xsl:with-param name="title" select="'provides per-element dependencies'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:needsCompletedIntegratorStep'"/>
            <xsl:with-param name="title" select="'needs completed integrator step'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:providesEvaluateDiscreteStates'"/>
            <xsl:with-param name="title" select="'provides evaluate discrete states'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:fixedInternalStepSize'"/>
            <xsl:with-param name="title" select="'fixed internal step size'"/>
            <xsl:with-param name="datatype" select="'xs:double'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:recommendedIntermediateInputSmoothness'"/>
            <xsl:with-param name="title" select="'recommended intermediate input smoothness'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:providesIntermediateUpdate'"/>
            <xsl:with-param name="title" select="'provides intermediate update'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:mightReturnEarlyFromDoStep'"/>
            <xsl:with-param name="title" select="'might return early from doStep'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:canReturnEarlyAfterIntermediateUpdate'"/>
            <xsl:with-param name="title" select="'can return early after intermediate update'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:hasEventMode'"/>
            <xsl:with-param name="title" select="'has event mode'"/>
            <xsl:with-param name="datatype" select="'xs:boolean'"/>
        </xsl:call-template>

        <!-- DefaultExperiment-level properties -->
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:startTime'"/>
            <xsl:with-param name="title" select="'start time'"/>
            <xsl:with-param name="datatype" select="'xs:double'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:stopTime'"/>
            <xsl:with-param name="title" select="'stop time'"/>
            <xsl:with-param name="datatype" select="'xs:double'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:tolerance'"/>
            <xsl:with-param name="title" select="'tolerance'"/>
            <xsl:with-param name="datatype" select="'xs:double'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:stepSize'"/>
            <xsl:with-param name="title" select="'step size'"/>
            <xsl:with-param name="datatype" select="'xs:double'"/>
        </xsl:call-template>

        <!-- Dependency (connection) properties -->
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:dependencyKind'"/>
            <xsl:with-param name="title" select="'dependency kind'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'dependent, constant, fixed, tunable or discrete.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:structureKind'"/>
            <xsl:with-param name="title" select="'model structure kind'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'Which ModelStructure list the dependency was declared in (Output, Derivative, InitialUnknown, ...).'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:dependencyScope'"/>
            <xsl:with-param name="title" select="'dependency scope'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'Single summary of how this variable declares its ModelStructure dependencies (precedence none &gt; explicit &gt; allKnowns): none = at least one role declares dependencies=&quot;&quot; (depends on nothing); explicit = it only declares non-empty dependency lists, captured as fmi:dependsOn relationships; allKnowns = no dependencies attribute, i.e. depends on all knowns by default.'"/>
        </xsl:call-template>

        <!-- Array / alias / start-value properties (FMI 3.0) -->
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:rank'"/>
            <xsl:with-param name="title" select="'rank'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
            <xsl:with-param name="definition" select="'Number of array dimensions of the variable (0 = scalar).'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:dimensionStart'"/>
            <xsl:with-param name="title" select="'dimension start (size)'"/>
            <xsl:with-param name="datatype" select="'xs:integer'"/>
            <xsl:with-param name="definition" select="'Fixed size of an array dimension (Dimension/@start).'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-property-class">
            <xsl:with-param name="id" select="'fmi:startValue'"/>
            <xsl:with-param name="title" select="'start value'"/>
            <xsl:with-param name="datatype" select="'xs:string'"/>
            <xsl:with-param name="definition" select="'A start value declared via a Start child element (FMI 3.0 String / Binary variables, one per array element).'"/>
        </xsl:call-template>

        <!-- Entity, Relationship and Link classes are emitted in SECTION 2 -->
        <xsl:call-template name="emit-ontology-classes"/>
        <!-- Enumeration classes (one per FMI enumeration type) are emitted in SECTION 2b -->
        <xsl:call-template name="emit-enumeration-classes"/>
    </xsl:template>

    <!-- ============================================================= -->
    <!-- SECTION 2: Ontology - Entity / Relationship / Link classes    -->
    <!-- ============================================================= -->
    <xsl:template name="emit-entity-class">
        <xsl:param name="id"/>
        <xsl:param name="title"/>
        <xsl:param name="definition"/>
        <cas:Entity rdf:type="owl:Class" id="{$id}">
            <cas:specializes>cas:Entity</cas:specializes>
            <dcterms:title>
                <xsl:value-of select="$title"/>
            </dcterms:title>
            <skos:definition>
                <xsl:value-of select="$definition"/>
            </skos:definition>
        </cas:Entity>
    </xsl:template>

    <xsl:template name="emit-link-class">
        <xsl:param name="id"/>
        <xsl:param name="title"/>
        <xsl:param name="endpoints"/>
        <cas:Link rdf:type="owl:ObjectProperty" id="{$id}">
            <cas:specializes>cas:Link</cas:specializes>
            <dcterms:title>
                <xsl:value-of select="$title"/>
            </dcterms:title>
            <xsl:for-each select="tokenize($endpoints, '\s+')">
                <cas:enumeratedEndpoint>
                    <xsl:value-of select="."/>
                </cas:enumeratedEndpoint>
            </xsl:for-each>
        </cas:Link>
    </xsl:template>

    <xsl:template name="emit-ontology-classes">
        <!-- Entity classes -->
        <xsl:call-template name="emit-entity-class">
            <xsl:with-param name="id" select="'fmi:FMU'"/>
            <xsl:with-param name="title" select="'FMU'"/>
            <xsl:with-param name="definition" select="'A Functional Mock-up Unit described by an FMI modelDescription.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-entity-class">
            <xsl:with-param name="id" select="'fmi:Variable'"/>
            <xsl:with-param name="title" select="'Variable'"/>
            <xsl:with-param name="definition" select="'A model variable (FMI 2.0 ScalarVariable or FMI 3.0 typed variable).'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-entity-class">
            <xsl:with-param name="id" select="'fmi:Unit'"/>
            <xsl:with-param name="title" select="'Unit'"/>
            <xsl:with-param name="definition" select="'A unit definition with respect to the SI base units.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-entity-class">
            <xsl:with-param name="id" select="'fmi:DisplayUnit'"/>
            <xsl:with-param name="title" select="'Display unit'"/>
            <xsl:with-param name="definition" select="'A human-readable display variant of a Unit, related to it by factor, offset and (FMI 3.0) inverse.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-entity-class">
            <xsl:with-param name="id" select="'fmi:TypeDefinition'"/>
            <xsl:with-param name="title" select="'Type definition'"/>
            <xsl:with-param name="definition" select="'A reusable simple type providing default attributes for variables.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-entity-class">
            <xsl:with-param name="id" select="'fmi:Interface'"/>
            <xsl:with-param name="title" select="'Interface'"/>
            <xsl:with-param name="definition" select="'A supported FMI interface type: ModelExchange, CoSimulation or ScheduledExecution.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-entity-class">
            <xsl:with-param name="id" select="'fmi:LogCategory'"/>
            <xsl:with-param name="title" select="'Log category'"/>
            <xsl:with-param name="definition" select="'A logging category supported by the FMU.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-entity-class">
            <xsl:with-param name="id" select="'fmi:DefaultExperiment'"/>
            <xsl:with-param name="title" select="'Default experiment'"/>
            <xsl:with-param name="definition" select="'Default simulation settings recommended by the FMU.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-entity-class">
            <xsl:with-param name="id" select="'fmi:Dimension'"/>
            <xsl:with-param name="title" select="'Dimension'"/>
            <xsl:with-param name="definition" select="'One array dimension of a variable (FMI 3.0), sized either by a fixed value or by another variable.'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-entity-class">
            <xsl:with-param name="id" select="'fmi:VariableAlias'"/>
            <xsl:with-param name="title" select="'Variable alias'"/>
            <xsl:with-param name="definition" select="'An alternative name (and optional display unit) for a variable (FMI 3.0 Alias).'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-entity-class">
            <xsl:with-param name="id" select="'fmi:StartValue'"/>
            <xsl:with-param name="title" select="'Start value'"/>
            <xsl:with-param name="definition" select="'A start value carried by a Start child element (FMI 3.0 String / Binary variables, one per array element).'"/>
        </xsl:call-template>

        <!-- Relationship class: variable dependency (connection) -->
        <cas:Relationship rdf:type="owl:Class" id="fmi:dependsOn">
            <cas:specializes>cas:Relationship</cas:specializes>
            <dcterms:title>depends on</dcterms:title>
            <skos:definition>A functional dependency declared in ModelStructure: the source variable depends on the target variable.</skos:definition>
            <cas:enumeratedProperty>fmi:dependencyKind</cas:enumeratedProperty>
            <cas:enumeratedProperty>fmi:structureKind</cas:enumeratedProperty>
        </cas:Relationship>

        <!-- Link classes -->
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:dependsOn-toSource'"/>
            <xsl:with-param name="title" select="'depends on (source)'"/>
            <xsl:with-param name="endpoints" select="'fmi:Variable'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:dependsOn-toTarget'"/>
            <xsl:with-param name="title" select="'depends on (target)'"/>
            <xsl:with-param name="endpoints" select="'fmi:Variable'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:hasVariable'"/>
            <xsl:with-param name="title" select="'has variable'"/>
            <xsl:with-param name="endpoints" select="'fmi:Variable'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:hasUnit'"/>
            <xsl:with-param name="title" select="'has unit'"/>
            <xsl:with-param name="endpoints" select="'fmi:Unit'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:hasTypeDefinition'"/>
            <xsl:with-param name="title" select="'has type definition'"/>
            <xsl:with-param name="endpoints" select="'fmi:TypeDefinition'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:hasInterface'"/>
            <xsl:with-param name="title" select="'has interface'"/>
            <xsl:with-param name="endpoints" select="'fmi:Interface'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:hasLogCategory'"/>
            <xsl:with-param name="title" select="'has log category'"/>
            <xsl:with-param name="endpoints" select="'fmi:LogCategory'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:hasDefaultExperiment'"/>
            <xsl:with-param name="title" select="'has default experiment'"/>
            <xsl:with-param name="endpoints" select="'fmi:DefaultExperiment'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:variableHasUnit'"/>
            <xsl:with-param name="title" select="'variable has unit'"/>
            <xsl:with-param name="endpoints" select="'fmi:Unit'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:variableHasType'"/>
            <xsl:with-param name="title" select="'variable has type definition'"/>
            <xsl:with-param name="endpoints" select="'fmi:TypeDefinition'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:hasDisplayUnit'"/>
            <xsl:with-param name="title" select="'has display unit'"/>
            <xsl:with-param name="endpoints" select="'fmi:DisplayUnit'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:variableHasDisplayUnit'"/>
            <xsl:with-param name="title" select="'variable has display unit'"/>
            <xsl:with-param name="endpoints" select="'fmi:DisplayUnit'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:hasDimension'"/>
            <xsl:with-param name="title" select="'has dimension'"/>
            <xsl:with-param name="endpoints" select="'fmi:Dimension'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:dimensionSizedBy'"/>
            <xsl:with-param name="title" select="'dimension sized by'"/>
            <xsl:with-param name="endpoints" select="'fmi:Variable'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:hasAlias'"/>
            <xsl:with-param name="title" select="'has alias'"/>
            <xsl:with-param name="endpoints" select="'fmi:VariableAlias'"/>
        </xsl:call-template>
        <xsl:call-template name="emit-link-class">
            <xsl:with-param name="id" select="'fmi:hasStartValue'"/>
            <xsl:with-param name="title" select="'has start value'"/>
            <xsl:with-param name="endpoints" select="'fmi:StartValue'"/>
        </xsl:call-template>
    </xsl:template>

    <!-- ============================================================= -->
    <!-- SECTION 2b: Ontology - Enumeration classes                    -->
    <!-- Each FMI enumeration type becomes a cas:Enumeration carrying   -->
    <!-- its Items as enumeratedValue (title = item name, value encoded -->
    <!-- in the id). A dedicated Link class connects variables to a     -->
    <!-- chosen value via its enumeratedEndpoint.                       -->
    <!-- ============================================================= -->
    <xsl:template name="emit-enumeration-classes">
        <xsl:for-each select="$enumTypes">
            <xsl:variable name="enumPos" select="position()"/>
            <xsl:variable name="items" select="if (local-name() = 'EnumerationType')
                then *[local-name()='Item']
                else *[local-name()='Enumeration']/*[local-name()='Item']"/>
            <cas:Enumeration cas:hasClass="owl:Class" id="fmi:enum-{$enumPos}">
                <dcterms:title>
                    <xsl:value-of select="@name"/>
                </dcterms:title>
                <xsl:if test="@description and string-length(@description) &gt; 0">
                    <skos:definition>
                        <xsl:value-of select="@description"/>
                    </skos:definition>
                </xsl:if>
                <cas:specializes>cas:Enumeration</cas:specializes>
                <xsl:for-each select="$items">
                    <xsl:variable name="vid" select="if (@value and string-length(string(@value)) &gt; 0) then string(@value) else string(position())"/>
                    <cas:enumeratedValue id="fmi:enum-{$enumPos}-{$vid}">
                        <dcterms:title>
                            <xsl:value-of select="@name"/>
                        </dcterms:title>
                    </cas:enumeratedValue>
                </xsl:for-each>
            </cas:Enumeration>
            <cas:Link rdf:type="owl:ObjectProperty" id="fmi:hasEnumValue-{$enumPos}">
                <cas:specializes>cas:Link</cas:specializes>
                <dcterms:title>
                    <xsl:text>has enumeration value (</xsl:text>
                    <xsl:value-of select="@name"/>
                    <xsl:text>)</xsl:text>
                </dcterms:title>
                <cas:enumeratedEndpoint>
                    <xsl:value-of select="concat('fmi:enum-', $enumPos)"/>
                </cas:enumeratedEndpoint>
            </cas:Link>
        </xsl:for-each>
    </xsl:template>

    <!-- ============================================================= -->
    <!-- Instance helpers                                              -->
    <!-- ============================================================= -->
    <xsl:template name="emit-prop">
        <xsl:param name="class"/>
        <xsl:param name="value"/>
        <xsl:if test="string-length(string($value)) &gt; 0">
            <cas:aProperty rdf:type="{$class}">
                <value>
                    <xsl:value-of select="$value"/>
                </value>
            </cas:aProperty>
        </xsl:if>
    </xsl:template>

    <xsl:template name="emit-target-link">
        <xsl:param name="class"/>
        <xsl:param name="idRef"/>
        <cas:aTargetLink rdf:type="{$class}">
            <idRef>
                <xsl:value-of select="$idRef"/>
            </idRef>
        </cas:aTargetLink>
    </xsl:template>

    <!-- ============================================================= -->
    <!-- SECTION 3: Instances                                          -->
    <!-- ============================================================= -->
    <xsl:template name="emit-instances">

        <!-- The FMU entity -->
        <cas:anEntity rdf:type="fmi:FMU" id="fmu">
            <dcterms:modified>
                <xsl:value-of select="$modified"/>
            </dcterms:modified>
            <dcterms:title>
                <xsl:value-of select="$md/@modelName"/>
            </dcterms:title>
            <xsl:if test="$md/@description and string-length($md/@description) &gt; 0">
                <dcterms:description>
                    <xsl:value-of select="$md/@description"/>
                </dcterms:description>
            </xsl:if>
            <xsl:call-template name="emit-prop">
                <xsl:with-param name="class" select="'fmi:fmiVersion'"/>
                <xsl:with-param name="value" select="$md/@fmiVersion"/>
            </xsl:call-template>
            <xsl:call-template name="emit-prop">
                <xsl:with-param name="class" select="'fmi:guid'"/>
                <xsl:with-param name="value" select="if ($md/@guid) then $md/@guid else $md/@instantiationToken"/>
            </xsl:call-template>
            <xsl:call-template name="emit-prop">
                <xsl:with-param name="class" select="'fmi:modelName'"/>
                <xsl:with-param name="value" select="$md/@modelName"/>
            </xsl:call-template>
            <xsl:call-template name="emit-prop">
                <xsl:with-param name="class" select="'fmi:author'"/>
                <xsl:with-param name="value" select="$md/@author"/>
            </xsl:call-template>
            <xsl:call-template name="emit-prop">
                <xsl:with-param name="class" select="'fmi:version'"/>
                <xsl:with-param name="value" select="$md/@version"/>
            </xsl:call-template>
            <xsl:call-template name="emit-prop">
                <xsl:with-param name="class" select="'fmi:copyright'"/>
                <xsl:with-param name="value" select="$md/@copyright"/>
            </xsl:call-template>
            <xsl:call-template name="emit-prop">
                <xsl:with-param name="class" select="'fmi:license'"/>
                <xsl:with-param name="value" select="$md/@license"/>
            </xsl:call-template>
            <xsl:call-template name="emit-prop">
                <xsl:with-param name="class" select="'fmi:generationTool'"/>
                <xsl:with-param name="value" select="$md/@generationTool"/>
            </xsl:call-template>
            <xsl:call-template name="emit-prop">
                <xsl:with-param name="class" select="'fmi:generationDateAndTime'"/>
                <xsl:with-param name="value" select="$md/@generationDateAndTime"/>
            </xsl:call-template>
            <xsl:call-template name="emit-prop">
                <xsl:with-param name="class" select="'fmi:variableNamingConvention'"/>
                <xsl:with-param name="value" select="$md/@variableNamingConvention"/>
            </xsl:call-template>
            <xsl:call-template name="emit-prop">
                <xsl:with-param name="class" select="'fmi:numberOfEventIndicators'"/>
                <xsl:with-param name="value" select="$md/@numberOfEventIndicators"/>
            </xsl:call-template>
            <!-- Containment links to all child entities -->
            <xsl:for-each select="$vars">
                <xsl:call-template name="emit-target-link">
                    <xsl:with-param name="class" select="'fmi:hasVariable'"/>
                    <xsl:with-param name="idRef" select="concat('var-', position())"/>
                </xsl:call-template>
            </xsl:for-each>
            <xsl:for-each select="$units">
                <xsl:call-template name="emit-target-link">
                    <xsl:with-param name="class" select="'fmi:hasUnit'"/>
                    <xsl:with-param name="idRef" select="concat('unit-', position())"/>
                </xsl:call-template>
            </xsl:for-each>
            <xsl:for-each select="$plainTypes">
                <xsl:call-template name="emit-target-link">
                    <xsl:with-param name="class" select="'fmi:hasTypeDefinition'"/>
                    <xsl:with-param name="idRef" select="concat('type-', position())"/>
                </xsl:call-template>
            </xsl:for-each>
            <xsl:for-each select="$interfaces">
                <xsl:call-template name="emit-target-link">
                    <xsl:with-param name="class" select="'fmi:hasInterface'"/>
                    <xsl:with-param name="idRef" select="concat('if-', position())"/>
                </xsl:call-template>
            </xsl:for-each>
            <xsl:for-each select="$logcats">
                <xsl:call-template name="emit-target-link">
                    <xsl:with-param name="class" select="'fmi:hasLogCategory'"/>
                    <xsl:with-param name="idRef" select="concat('logcat-', position())"/>
                </xsl:call-template>
            </xsl:for-each>
            <xsl:if test="$experiment">
                <xsl:call-template name="emit-target-link">
                    <xsl:with-param name="class" select="'fmi:hasDefaultExperiment'"/>
                    <xsl:with-param name="idRef" select="'defaultExperiment'"/>
                </xsl:call-template>
            </xsl:if>
        </cas:anEntity>

        <!-- Variable entities -->
        <xsl:for-each select="$vars">
            <xsl:variable name="isScalar" select="local-name() = 'ScalarVariable'"/>
            <xsl:variable name="typed" select="*[local-name() = ('Real','Integer','Boolean','String','Enumeration')]"/>
            <xsl:variable name="attrNode" select="if ($isScalar) then $typed else ."/>
            <xsl:variable name="dataType" select="if ($isScalar) then local-name($typed) else local-name(.)"/>
            <xsl:variable name="unitName" select="string($attrNode/@unit)"/>
            <xsl:variable name="unitPos" select="(for $i in 1 to count($units) return if (string($units[$i]/@name) = $unitName) then $i else ())[1]"/>
            <xsl:variable name="typeName" select="string($attrNode/@declaredType)"/>
            <xsl:variable name="typePos" select="(for $i in 1 to count($plainTypes) return if (string($plainTypes[$i]/@name) = $typeName) then $i else ())[1]"/>
            <xsl:variable name="enumPos" select="(for $i in 1 to count($enumTypes) return if (string($enumTypes[$i]/@name) = $typeName) then $i else ())[1]"/>
            <xsl:variable name="startVal" select="string($attrNode/@start)"/>
            <xsl:variable name="duName" select="string($attrNode/@displayUnit)"/>
            <xsl:variable name="duPos" select="if (exists($unitPos))
                then (for $j in 1 to count($units[$unitPos]/*[local-name()='DisplayUnit'])
                    return if (string($units[$unitPos]/*[local-name()='DisplayUnit'][$j]/@name) = $duName) then $j else ())[1]
                else ()"/>
            <!-- Variable position and array / alias / start children (FMI 3.0) -->
            <xsl:variable name="vp" select="position()"/>
            <xsl:variable name="vVR" select="string(@valueReference)"/>
            <xsl:variable name="dims" select="*[local-name()='Dimension']"/>
            <xsl:variable name="aliases" select="*[local-name()='Alias']"/>
            <xsl:variable name="startEls" select="*[local-name()='Start']"/>
            <!-- single dependency-scope summary for this variable.
                 Precedence: none > explicit > allKnowns.
                 none      = at least one role declares dependencies="" (depends on nothing)
                 explicit  = it only declares non-empty dependency lists (edges: fmi:dependsOn)
                 allKnowns = it appears with no dependencies attribute (depends on all knowns) -->
            <xsl:variable name="msRefs" select="$md/*[local-name()='ModelStructure']//*[@index or @valueReference][
                (@index and string(@index) = string($vp)) or
                (@valueReference and not(@index) and string(@valueReference) = $vVR)]"/>
            <xsl:variable name="depScope" select="
                if ($msRefs[@dependencies and normalize-space(@dependencies) = '']) then 'none'
                else if ($msRefs[@dependencies and normalize-space(@dependencies) != '']) then 'explicit'
                else if (exists($msRefs)) then 'allKnowns'
                else ()"/>

            <cas:anEntity rdf:type="fmi:Variable" id="var-{position()}">
                <dcterms:modified>
                    <xsl:value-of select="$modified"/>
                </dcterms:modified>
                <dcterms:title>
                    <xsl:value-of select="@name"/>
                </dcterms:title>
                <xsl:if test="@description and string-length(@description) &gt; 0">
                    <dcterms:description>
                        <xsl:value-of select="@description"/>
                    </dcterms:description>
                </xsl:if>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:valueReference'"/>
                    <xsl:with-param name="value" select="@valueReference"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:causality'"/>
                    <xsl:with-param name="value" select="@causality"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:variability'"/>
                    <xsl:with-param name="value" select="@variability"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:initial'"/>
                    <xsl:with-param name="value" select="@initial"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:dataType'"/>
                    <xsl:with-param name="value" select="$dataType"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:start'"/>
                    <xsl:with-param name="value" select="$attrNode/@start"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:declaredType'"/>
                    <xsl:with-param name="value" select="$attrNode/@declaredType"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:unit'"/>
                    <xsl:with-param name="value" select="$attrNode/@unit"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:displayUnit'"/>
                    <xsl:with-param name="value" select="$attrNode/@displayUnit"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:quantity'"/>
                    <xsl:with-param name="value" select="$attrNode/@quantity"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:min'"/>
                    <xsl:with-param name="value" select="$attrNode/@min"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:max'"/>
                    <xsl:with-param name="value" select="$attrNode/@max"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:nominal'"/>
                    <xsl:with-param name="value" select="$attrNode/@nominal"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:derivative'"/>
                    <xsl:with-param name="value" select="$attrNode/@derivative"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:canHandleMultipleSetPerTimeInstant'"/>
                    <xsl:with-param name="value" select="@canHandleMultipleSetPerTimeInstant"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:clocks'"/>
                    <xsl:with-param name="value" select="@clocks"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:intermediateUpdate'"/>
                    <xsl:with-param name="value" select="@intermediateUpdate"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:previous'"/>
                    <xsl:with-param name="value" select="@previous"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:reinit'"/>
                    <xsl:with-param name="value" select="$attrNode/@reinit"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:relativeQuantity'"/>
                    <xsl:with-param name="value" select="$attrNode/@relativeQuantity"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:unbounded'"/>
                    <xsl:with-param name="value" select="$attrNode/@unbounded"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:mimeType'"/>
                    <xsl:with-param name="value" select="$attrNode/@mimeType"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:maxSize'"/>
                    <xsl:with-param name="value" select="$attrNode/@maxSize"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:canBeDeactivated'"/>
                    <xsl:with-param name="value" select="$attrNode/@canBeDeactivated"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:priority'"/>
                    <xsl:with-param name="value" select="$attrNode/@priority"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:intervalVariability'"/>
                    <xsl:with-param name="value" select="$attrNode/@intervalVariability"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:intervalDecimal'"/>
                    <xsl:with-param name="value" select="$attrNode/@intervalDecimal"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:shiftDecimal'"/>
                    <xsl:with-param name="value" select="$attrNode/@shiftDecimal"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:supportsFraction'"/>
                    <xsl:with-param name="value" select="$attrNode/@supportsFraction"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:resolution'"/>
                    <xsl:with-param name="value" select="$attrNode/@resolution"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:intervalCounter'"/>
                    <xsl:with-param name="value" select="$attrNode/@intervalCounter"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:shiftCounter'"/>
                    <xsl:with-param name="value" select="$attrNode/@shiftCounter"/>
                </xsl:call-template>
                <xsl:if test="count($dims) &gt; 0">
                    <xsl:call-template name="emit-prop">
                        <xsl:with-param name="class" select="'fmi:rank'"/>
                        <xsl:with-param name="value" select="count($dims)"/>
                    </xsl:call-template>
                </xsl:if>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:dependencyScope'"/>
                    <xsl:with-param name="value" select="$depScope"/>
                </xsl:call-template>
                <xsl:if test="string-length($unitName) &gt; 0 and exists($unitPos)">
                    <xsl:call-template name="emit-target-link">
                        <xsl:with-param name="class" select="'fmi:variableHasUnit'"/>
                        <xsl:with-param name="idRef" select="concat('unit-', $unitPos)"/>
                    </xsl:call-template>
                </xsl:if>
                <xsl:if test="string-length($typeName) &gt; 0 and exists($typePos)">
                    <xsl:call-template name="emit-target-link">
                        <xsl:with-param name="class" select="'fmi:variableHasType'"/>
                        <xsl:with-param name="idRef" select="concat('type-', $typePos)"/>
                    </xsl:call-template>
                </xsl:if>
                <xsl:if test="string-length($duName) &gt; 0 and exists($unitPos) and exists($duPos)">
                    <xsl:call-template name="emit-target-link">
                        <xsl:with-param name="class" select="'fmi:variableHasDisplayUnit'"/>
                        <xsl:with-param name="idRef" select="concat('displayunit-', $unitPos, '-', $duPos)"/>
                    </xsl:call-template>
                </xsl:if>
                <xsl:if test="exists($enumPos) and string-length($startVal) &gt; 0">
                    <xsl:variable name="enumNode" select="$enumTypes[$enumPos]"/>
                    <xsl:variable name="enumItems" select="if (local-name($enumNode) = 'EnumerationType')
                        then $enumNode/*[local-name()='Item']
                        else $enumNode/*[local-name()='Enumeration']/*[local-name()='Item']"/>
                    <xsl:if test="exists($enumItems[string(@value) = $startVal])">
                        <xsl:call-template name="emit-target-link">
                            <xsl:with-param name="class" select="concat('fmi:hasEnumValue-', $enumPos)"/>
                            <xsl:with-param name="idRef" select="concat('fmi:enum-', $enumPos, '-', $startVal)"/>
                        </xsl:call-template>
                    </xsl:if>
                </xsl:if>
                <!-- links to array dimension / alias / start-value sub-entities (FMI 3.0) -->
                <xsl:for-each select="$dims">
                    <xsl:call-template name="emit-target-link">
                        <xsl:with-param name="class" select="'fmi:hasDimension'"/>
                        <xsl:with-param name="idRef" select="concat('dim-', $vp, '-', position())"/>
                    </xsl:call-template>
                </xsl:for-each>
                <xsl:for-each select="$aliases">
                    <xsl:call-template name="emit-target-link">
                        <xsl:with-param name="class" select="'fmi:hasAlias'"/>
                        <xsl:with-param name="idRef" select="concat('alias-', $vp, '-', position())"/>
                    </xsl:call-template>
                </xsl:for-each>
                <xsl:for-each select="$startEls">
                    <xsl:call-template name="emit-target-link">
                        <xsl:with-param name="class" select="'fmi:hasStartValue'"/>
                        <xsl:with-param name="idRef" select="concat('start-', $vp, '-', position())"/>
                    </xsl:call-template>
                </xsl:for-each>
            </cas:anEntity>

            <!-- Dimension sub-entities (link to the sizing variable when dynamic) -->
            <xsl:for-each select="$dims">
                <xsl:variable name="dimSizeVR" select="string(@valueReference)"/>
                <xsl:variable name="dimVarPos" select="if (string-length($dimSizeVR) &gt; 0)
                    then (for $i in 1 to count($vars) return if (string($vars[$i]/@valueReference) = $dimSizeVR) then $i else ())[1]
                    else ()"/>
                <cas:anEntity rdf:type="fmi:Dimension" id="dim-{$vp}-{position()}">
                    <dcterms:modified>
                        <xsl:value-of select="$modified"/>
                    </dcterms:modified>
                    <dcterms:title>
                        <xsl:value-of select="concat('Dimension ', position())"/>
                    </dcterms:title>
                    <xsl:call-template name="emit-prop">
                        <xsl:with-param name="class" select="'fmi:dimensionStart'"/>
                        <xsl:with-param name="value" select="@start"/>
                    </xsl:call-template>
                    <xsl:call-template name="emit-prop">
                        <xsl:with-param name="class" select="'fmi:valueReference'"/>
                        <xsl:with-param name="value" select="@valueReference"/>
                    </xsl:call-template>
                    <xsl:if test="exists($dimVarPos)">
                        <xsl:call-template name="emit-target-link">
                            <xsl:with-param name="class" select="'fmi:dimensionSizedBy'"/>
                            <xsl:with-param name="idRef" select="concat('var-', $dimVarPos)"/>
                        </xsl:call-template>
                    </xsl:if>
                </cas:anEntity>
            </xsl:for-each>

            <!-- Alias sub-entities -->
            <xsl:for-each select="$aliases">
                <cas:anEntity rdf:type="fmi:VariableAlias" id="alias-{$vp}-{position()}">
                    <dcterms:modified>
                        <xsl:value-of select="$modified"/>
                    </dcterms:modified>
                    <dcterms:title>
                        <xsl:value-of select="@name"/>
                    </dcterms:title>
                    <xsl:if test="@description and string-length(@description) &gt; 0">
                        <dcterms:description>
                            <xsl:value-of select="@description"/>
                        </dcterms:description>
                    </xsl:if>
                    <xsl:call-template name="emit-prop">
                        <xsl:with-param name="class" select="'fmi:displayUnit'"/>
                        <xsl:with-param name="value" select="@displayUnit"/>
                    </xsl:call-template>
                </cas:anEntity>
            </xsl:for-each>

            <!-- Start-value sub-entities (FMI 3.0 String / Binary) -->
            <xsl:for-each select="$startEls">
                <cas:anEntity rdf:type="fmi:StartValue" id="start-{$vp}-{position()}">
                    <dcterms:modified>
                        <xsl:value-of select="$modified"/>
                    </dcterms:modified>
                    <dcterms:title>
                        <xsl:value-of select="concat('Start ', position())"/>
                    </dcterms:title>
                    <xsl:call-template name="emit-prop">
                        <xsl:with-param name="class" select="'fmi:startValue'"/>
                        <xsl:with-param name="value" select="@value"/>
                    </xsl:call-template>
                </cas:anEntity>
            </xsl:for-each>
        </xsl:for-each>

        <!-- Unit entities (+ their DisplayUnit sub-entities) -->
        <xsl:for-each select="$units">
            <xsl:variable name="unitPos" select="position()"/>
            <xsl:variable name="bu" select="*[local-name()='BaseUnit']"/>
            <xsl:variable name="dus" select="*[local-name()='DisplayUnit']"/>
            <cas:anEntity rdf:type="fmi:Unit" id="unit-{$unitPos}">
                <dcterms:modified>
                    <xsl:value-of select="$modified"/>
                </dcterms:modified>
                <dcterms:title>
                    <xsl:value-of select="@name"/>
                </dcterms:title>
                <!-- one integer property per non-zero SI base-unit exponent -->
                <xsl:for-each select="$bu/@*[local-name() = ('kg','m','s','A','K','mol','cd','rad')][. != '0']">
                    <xsl:call-template name="emit-prop">
                        <xsl:with-param name="class" select="concat('fmi:exp_', local-name())"/>
                        <xsl:with-param name="value" select="."/>
                    </xsl:call-template>
                </xsl:for-each>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:factor'"/>
                    <xsl:with-param name="value" select="$bu/@factor"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:offset'"/>
                    <xsl:with-param name="value" select="$bu/@offset"/>
                </xsl:call-template>
                <!-- link to each shared DisplayUnit of this unit -->
                <xsl:for-each select="$dus">
                    <xsl:call-template name="emit-target-link">
                        <xsl:with-param name="class" select="'fmi:hasDisplayUnit'"/>
                        <xsl:with-param name="idRef" select="concat('displayunit-', $unitPos, '-', position())"/>
                    </xsl:call-template>
                </xsl:for-each>
            </cas:anEntity>
            <!-- DisplayUnit entities for this unit -->
            <xsl:for-each select="$dus">
                <cas:anEntity rdf:type="fmi:DisplayUnit" id="displayunit-{$unitPos}-{position()}">
                    <dcterms:modified>
                        <xsl:value-of select="$modified"/>
                    </dcterms:modified>
                    <dcterms:title>
                        <xsl:value-of select="@name"/>
                    </dcterms:title>
                    <xsl:call-template name="emit-prop">
                        <xsl:with-param name="class" select="'fmi:factor'"/>
                        <xsl:with-param name="value" select="@factor"/>
                    </xsl:call-template>
                    <xsl:call-template name="emit-prop">
                        <xsl:with-param name="class" select="'fmi:offset'"/>
                        <xsl:with-param name="value" select="@offset"/>
                    </xsl:call-template>
                    <xsl:call-template name="emit-prop">
                        <xsl:with-param name="class" select="'fmi:inverse'"/>
                        <xsl:with-param name="value" select="@inverse"/>
                    </xsl:call-template>
                </cas:anEntity>
            </xsl:for-each>
        </xsl:for-each>

        <!-- Type definition entities (enumerations are emitted as cas:Enumeration classes) -->
        <xsl:for-each select="$plainTypes">
            <xsl:variable name="isSimple" select="local-name() = 'SimpleType'"/>
            <xsl:variable name="typedT" select="*[local-name() = ('Real','Integer','Boolean','String','Enumeration')]"/>
            <xsl:variable name="tAttr" select="if ($isSimple) then $typedT else ."/>
            <xsl:variable name="baseType" select="if ($isSimple) then local-name($typedT) else local-name(.)"/>
            <xsl:variable name="tUnitName" select="string($tAttr/@unit)"/>
            <xsl:variable name="tUnitPos" select="(for $i in 1 to count($units) return if (string($units[$i]/@name) = $tUnitName) then $i else ())[1]"/>
            <xsl:variable name="tDuName" select="string($tAttr/@displayUnit)"/>
            <xsl:variable name="tDuPos" select="if (exists($tUnitPos))
                then (for $j in 1 to count($units[$tUnitPos]/*[local-name()='DisplayUnit'])
                    return if (string($units[$tUnitPos]/*[local-name()='DisplayUnit'][$j]/@name) = $tDuName) then $j else ())[1]
                else ()"/>
            <cas:anEntity rdf:type="fmi:TypeDefinition" id="type-{position()}">
                <dcterms:modified>
                    <xsl:value-of select="$modified"/>
                </dcterms:modified>
                <dcterms:title>
                    <xsl:value-of select="@name"/>
                </dcterms:title>
                <xsl:if test="@description and string-length(@description) &gt; 0">
                    <dcterms:description>
                        <xsl:value-of select="@description"/>
                    </dcterms:description>
                </xsl:if>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:baseType'"/>
                    <xsl:with-param name="value" select="$baseType"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:quantity'"/>
                    <xsl:with-param name="value" select="$tAttr/@quantity"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:unit'"/>
                    <xsl:with-param name="value" select="$tAttr/@unit"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:displayUnit'"/>
                    <xsl:with-param name="value" select="$tAttr/@displayUnit"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:min'"/>
                    <xsl:with-param name="value" select="$tAttr/@min"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:max'"/>
                    <xsl:with-param name="value" select="$tAttr/@max"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:nominal'"/>
                    <xsl:with-param name="value" select="$tAttr/@nominal"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:relativeQuantity'"/>
                    <xsl:with-param name="value" select="$tAttr/@relativeQuantity"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:unbounded'"/>
                    <xsl:with-param name="value" select="$tAttr/@unbounded"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:mimeType'"/>
                    <xsl:with-param name="value" select="$tAttr/@mimeType"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:maxSize'"/>
                    <xsl:with-param name="value" select="$tAttr/@maxSize"/>
                </xsl:call-template>
                <!-- A type definition shares the same Unit / DisplayUnit entities -->
                <!-- that variables of this type reference (many-to-one fan-in). -->
                <xsl:if test="string-length($tUnitName) &gt; 0 and exists($tUnitPos)">
                    <xsl:call-template name="emit-target-link">
                        <xsl:with-param name="class" select="'fmi:variableHasUnit'"/>
                        <xsl:with-param name="idRef" select="concat('unit-', $tUnitPos)"/>
                    </xsl:call-template>
                </xsl:if>
                <xsl:if test="string-length($tDuName) &gt; 0 and exists($tUnitPos) and exists($tDuPos)">
                    <xsl:call-template name="emit-target-link">
                        <xsl:with-param name="class" select="'fmi:variableHasDisplayUnit'"/>
                        <xsl:with-param name="idRef" select="concat('displayunit-', $tUnitPos, '-', $tDuPos)"/>
                    </xsl:call-template>
                </xsl:if>
            </cas:anEntity>
        </xsl:for-each>

        <!-- Interface entities -->
        <xsl:for-each select="$interfaces">
            <cas:anEntity rdf:type="fmi:Interface" id="if-{position()}">
                <dcterms:modified>
                    <xsl:value-of select="$modified"/>
                </dcterms:modified>
                <dcterms:title>
                    <xsl:value-of select="local-name()"/>
                </dcterms:title>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:interfaceType'"/>
                    <xsl:with-param name="value" select="local-name()"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:modelIdentifier'"/>
                    <xsl:with-param name="value" select="@modelIdentifier"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:needsExecutionTool'"/>
                    <xsl:with-param name="value" select="@needsExecutionTool"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:canGetAndSetFMUstate'"/>
                    <xsl:with-param name="value" select="if (@canGetAndSetFMUState) then @canGetAndSetFMUState else @canGetAndSetFMUstate"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:canSerializeFMUstate'"/>
                    <xsl:with-param name="value" select="if (@canSerializeFMUState) then @canSerializeFMUState else @canSerializeFMUstate"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:providesDirectionalDerivative'"/>
                    <xsl:with-param name="value" select="if (@providesDirectionalDerivative) then @providesDirectionalDerivative else @providesDirectionalDerivatives"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:canHandleVariableCommunicationStepSize'"/>
                    <xsl:with-param name="value" select="@canHandleVariableCommunicationStepSize"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:maxOutputDerivativeOrder'"/>
                    <xsl:with-param name="value" select="@maxOutputDerivativeOrder"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:completedIntegratorStepNotNeeded'"/>
                    <xsl:with-param name="value" select="@completedIntegratorStepNotNeeded"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:canBeInstantiatedOnlyOncePerProcess'"/>
                    <xsl:with-param name="value" select="@canBeInstantiatedOnlyOncePerProcess"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:canNotUseMemoryManagementFunctions'"/>
                    <xsl:with-param name="value" select="@canNotUseMemoryManagementFunctions"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:canInterpolateInputs'"/>
                    <xsl:with-param name="value" select="@canInterpolateInputs"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:canRunAsynchronuously'"/>
                    <xsl:with-param name="value" select="@canRunAsynchronuously"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:providesAdjointDerivatives'"/>
                    <xsl:with-param name="value" select="@providesAdjointDerivatives"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:providesPerElementDependencies'"/>
                    <xsl:with-param name="value" select="@providesPerElementDependencies"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:needsCompletedIntegratorStep'"/>
                    <xsl:with-param name="value" select="@needsCompletedIntegratorStep"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:providesEvaluateDiscreteStates'"/>
                    <xsl:with-param name="value" select="@providesEvaluateDiscreteStates"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:fixedInternalStepSize'"/>
                    <xsl:with-param name="value" select="@fixedInternalStepSize"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:recommendedIntermediateInputSmoothness'"/>
                    <xsl:with-param name="value" select="@recommendedIntermediateInputSmoothness"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:providesIntermediateUpdate'"/>
                    <xsl:with-param name="value" select="@providesIntermediateUpdate"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:mightReturnEarlyFromDoStep'"/>
                    <xsl:with-param name="value" select="@mightReturnEarlyFromDoStep"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:canReturnEarlyAfterIntermediateUpdate'"/>
                    <xsl:with-param name="value" select="@canReturnEarlyAfterIntermediateUpdate"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:hasEventMode'"/>
                    <xsl:with-param name="value" select="@hasEventMode"/>
                </xsl:call-template>
            </cas:anEntity>
        </xsl:for-each>

        <!-- Log category entities -->
        <xsl:for-each select="$logcats">
            <cas:anEntity rdf:type="fmi:LogCategory" id="logcat-{position()}">
                <dcterms:modified>
                    <xsl:value-of select="$modified"/>
                </dcterms:modified>
                <dcterms:title>
                    <xsl:value-of select="@name"/>
                </dcterms:title>
                <xsl:if test="@description and string-length(@description) &gt; 0">
                    <dcterms:description>
                        <xsl:value-of select="@description"/>
                    </dcterms:description>
                </xsl:if>
            </cas:anEntity>
        </xsl:for-each>

        <!-- Default experiment entity -->
        <xsl:if test="$experiment">
            <cas:anEntity rdf:type="fmi:DefaultExperiment" id="defaultExperiment">
                <dcterms:modified>
                    <xsl:value-of select="$modified"/>
                </dcterms:modified>
                <dcterms:title>Default Experiment</dcterms:title>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:startTime'"/>
                    <xsl:with-param name="value" select="$experiment/@startTime"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:stopTime'"/>
                    <xsl:with-param name="value" select="$experiment/@stopTime"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:tolerance'"/>
                    <xsl:with-param name="value" select="$experiment/@tolerance"/>
                </xsl:call-template>
                <xsl:call-template name="emit-prop">
                    <xsl:with-param name="class" select="'fmi:stepSize'"/>
                    <xsl:with-param name="value" select="$experiment/@stepSize"/>
                </xsl:call-template>
            </cas:anEntity>
        </xsl:if>

        <!-- Dependency (connection) relationships -->
        <xsl:for-each select="$md/*[local-name()='ModelStructure']//*[@index or @valueReference]">
            <xsl:variable name="uPos" select="position()"/>
            <xsl:variable name="ownerIsVR" select="boolean(@valueReference) and not(@index)"/>
            <xsl:variable name="ownerPos" select="if ($ownerIsVR)
                then (for $i in 1 to count($vars) return if (string($vars[$i]/@valueReference) = string(@valueReference)) then $i else ())[1]
                else xs:integer(@index)"/>
            <xsl:variable name="structureKind" select="if (local-name() = 'Unknown') then local-name(..) else local-name()"/>
            <xsl:variable name="depTokens" select="tokenize(normalize-space(@dependencies), '\s+')"/>
            <xsl:variable name="kindTokens" select="tokenize(normalize-space(@dependenciesKind), '\s+')"/>
            <xsl:if test="@dependencies and string-length(normalize-space(@dependencies)) &gt; 0 and exists($ownerPos)">
                <xsl:for-each select="$depTokens">
                    <xsl:variable name="tok" select="."/>
                    <xsl:variable name="depIdx" select="position()"/>
                    <xsl:if test="string-length($tok) &gt; 0">
                        <xsl:variable name="depPos" select="if ($ownerIsVR)
                            then (for $i in 1 to count($vars) return if (string($vars[$i]/@valueReference) = $tok) then $i else ())[1]
                            else xs:integer($tok)"/>
                        <xsl:if test="exists($depPos)">
                            <cas:aRelationship rdf:type="fmi:dependsOn" id="dep-u{$uPos}-{$depIdx}">
                                <dcterms:modified>
                                    <xsl:value-of select="$modified"/>
                                </dcterms:modified>
                                <dcterms:description>
                                    <xsl:value-of select="$vars[$ownerPos]/@name"/>
                                    <xsl:text> depends on </xsl:text>
                                    <xsl:value-of select="$vars[$depPos]/@name"/>
                                </dcterms:description>
                                <xsl:call-template name="emit-prop">
                                    <xsl:with-param name="class" select="'fmi:dependencyKind'"/>
                                    <xsl:with-param name="value" select="$kindTokens[$depIdx]"/>
                                </xsl:call-template>
                                <xsl:call-template name="emit-prop">
                                    <xsl:with-param name="class" select="'fmi:structureKind'"/>
                                    <xsl:with-param name="value" select="$structureKind"/>
                                </xsl:call-template>
                                <cas:aSourceLink rdf:type="fmi:dependsOn-toSource">
                                    <idRef>
                                        <xsl:value-of select="concat('var-', $ownerPos)"/>
                                    </idRef>
                                </cas:aSourceLink>
                                <cas:aTargetLink rdf:type="fmi:dependsOn-toTarget">
                                    <idRef>
                                        <xsl:value-of select="concat('var-', $depPos)"/>
                                    </idRef>
                                </cas:aTargetLink>
                            </cas:aRelationship>
                        </xsl:if>
                    </xsl:if>
                </xsl:for-each>
            </xsl:if>
        </xsl:for-each>

    </xsl:template>

</xsl:stylesheet>
