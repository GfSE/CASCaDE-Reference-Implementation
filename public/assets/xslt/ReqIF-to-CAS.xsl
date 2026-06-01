<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:cas="http://product-information-graph.org" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:csc="http://omg.org/CASCaRA/cas/" xmlns:reqif="http://www.omg.org/spec/ReqIF/20110401/reqif.xsd" xmlns:sh="http://www.w3.org/ns/shacl#" xmlns:xs="http://www.w3.org/2001/XMLSchema#" xmlns:owl="http://www.w3.org/2002/07/owl#">
    <xsl:output method="xml" encoding="UTF-8" indent="yes" standalone="yes"/>
    <!-- Root template -->
    <xsl:template match="/">
        <xsl:variable name="header" select="//*[local-name()='REQ-IF-HEADER']"/>
        <cas:aPackage rdf:type="cas:Package">
            <xsl:attribute name="id">
                <xsl:choose>
                    <xsl:when test="$header/@IDENTIFIER">
                        <xsl:value-of select="$header/@IDENTIFIER"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>reqif-package</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
            <dcterms:title>
                <xsl:choose>
                    <xsl:when test="$header/*[local-name()='TITLE'] and string-length($header/*[local-name()='TITLE']) &gt; 0">
                        <xsl:value-of select="$header/*[local-name()='TITLE']"/>
                    </xsl:when>
                    <xsl:when test="$header/*[local-name()='REPOSITORY-ID'] and string-length($header/*[local-name()='REPOSITORY-ID']) &gt; 0">
                        <xsl:text>Requirements from </xsl:text>
                        <xsl:value-of select="$header/*[local-name()='REPOSITORY-ID']"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>Requirements from unknown project</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </dcterms:title>
            <dcterms:description>
                <xsl:choose>
                    <xsl:when test="$header/*[local-name()='COMMENT'] and string-length($header/*[local-name()='COMMENT']) &gt; 0">
                        <xsl:value-of select="$header/*[local-name()='COMMENT']"/>
                    </xsl:when>
                    <xsl:when test="$header/*[local-name()='REQ-IF-TOOL-ID'] and string-length($header/*[local-name()='REQ-IF-TOOL-ID']) &gt; 0">
                        <xsl:text>Created with </xsl:text>
                        <xsl:value-of select="$header/*[local-name()='REQ-IF-TOOL-ID']"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>ReqIF Document</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </dcterms:description>
            <dcterms:modified>
                <xsl:if test="$header/*[local-name()='CREATION-TIME']">
                    <xsl:value-of select="$header/*[local-name()='CREATION-TIME']"/>
                </xsl:if>
            </dcterms:modified>
            <graph>
                <!-- Collect all ATTRIBUTE-DEFINITIONS from all OBJECT-TYPEs -->
                <xsl:apply-templates select="//*[local-name()='SPEC-OBJECT-TYPE']/*[local-name()='SPEC-ATTRIBUTES']/*[starts-with(local-name(), 'ATTRIBUTE-DEFINITION-')]"/>
                <xsl:apply-templates select="//*[local-name()='SPECIFICATION-TYPE']/*[local-name()='SPEC-ATTRIBUTES']/*[starts-with(local-name(), 'ATTRIBUTE-DEFINITION-')]"/>
                <xsl:apply-templates select="//*[local-name()='SPEC-RELATION-TYPE']/*[local-name()='SPEC-ATTRIBUTES']/*[starts-with(local-name(), 'ATTRIBUTE-DEFINITION-')]"/>
                <!-- Collect SPECIFICATION-TYPEs and OBJECT-TYPEs as Entities -->
                <xsl:apply-templates select="//*[local-name()='SPEC-OBJECT-TYPE']" mode="entity"/>
                <xsl:apply-templates select="//*[local-name()='SPECIFICATION-TYPE']" mode="entity"/>
                <xsl:apply-templates select="//*[local-name()='SPEC-RELATION-TYPE']" mode="relationship"/>
                <!-- Collect all SPEC-OBJECTs -->
                <xsl:apply-templates select="//*[local-name()='SPEC-OBJECT']"/>
                <!-- Collect all SPEC-RELATIONs -->
                <xsl:apply-templates select="//*[local-name()='SPEC-RELATION']"/>
            </graph>
        </cas:aPackage>
    </xsl:template>

    <!-- Template for ATTRIBUTE-DEFINITION-STRING -->
    <xsl:template match="*[local-name()='ATTRIBUTE-DEFINITION-STRING']">
        <cas:Property rdf:type="owl:DatatypeProperty">
            <xsl:attribute name="id">
                <xsl:value-of select="@IDENTIFIER"/>
            </xsl:attribute>
            <dcterms:title>
                <xsl:value-of select="@LONG-NAME"/>
            </dcterms:title>
            <xsl:if test="@DESC and string-length(@DESC) &gt; 0">
                <dcterms:description>
                    <xsl:value-of select="@DESC"/>
                </dcterms:description>
            </xsl:if>
            <xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
                <dcterms:modified>
                    <xsl:value-of select="@LAST-CHANGE"/>
                </dcterms:modified>
            </xsl:if>
            <sh:datatype>xs:string</sh:datatype>
        </cas:Property>
    </xsl:template>

    <!-- Template for ATTRIBUTE-DEFINITION-XHTML -->
    <xsl:template match="*[local-name()='ATTRIBUTE-DEFINITION-XHTML']">
        <cas:Property rdf:type="owl:DatatypeProperty">
            <xsl:attribute name="id">
                <xsl:value-of select="@IDENTIFIER"/>
            </xsl:attribute>
            <dcterms:title>
                <xsl:value-of select="@LONG-NAME"/>
            </dcterms:title>
            <xsl:if test="@DESC and string-length(@DESC) &gt; 0">
                <dcterms:description>
                    <xsl:value-of select="@DESC"/>
                </dcterms:description>
            </xsl:if>
            <xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
                <dcterms:modified>
                    <xsl:value-of select="@LAST-CHANGE"/>
                </dcterms:modified>
            </xsl:if>
            <sh:datatype>xs:string</sh:datatype>
        </cas:Property>
    </xsl:template>

    <!-- Template for ATTRIBUTE-DEFINITION-INTEGER -->
    <xsl:template match="*[local-name()='ATTRIBUTE-DEFINITION-INTEGER']">
        <cas:Property rdf:type="owl:DatatypeProperty">
            <xsl:attribute name="id">
                <xsl:value-of select="@IDENTIFIER"/>
            </xsl:attribute>
            <dcterms:title>
                <xsl:value-of select="@LONG-NAME"/>
            </dcterms:title>
            <xsl:if test="@DESC and string-length(@DESC) &gt; 0">
                <dcterms:description>
                    <xsl:value-of select="@DESC"/>
                </dcterms:description>
            </xsl:if>
            <xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
                <dcterms:modified>
                    <xsl:value-of select="@LAST-CHANGE"/>
                </dcterms:modified>
            </xsl:if>
            <sh:datatype>xs:integer</sh:datatype>
        </cas:Property>
    </xsl:template>

    <!-- Template for ATTRIBUTE-DEFINITION-REAL -->
    <xsl:template match="*[local-name()='ATTRIBUTE-DEFINITION-REAL']">
        <cas:Property rdf:type="owl:DatatypeProperty">
            <xsl:attribute name="id">
                <xsl:value-of select="@IDENTIFIER"/>
            </xsl:attribute>
            <dcterms:title>
                <xsl:value-of select="@LONG-NAME"/>
            </dcterms:title>
            <xsl:if test="@DESC and string-length(@DESC) &gt; 0">
                <dcterms:description>
                    <xsl:value-of select="@DESC"/>
                </dcterms:description>
            </xsl:if>
            <xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
                <dcterms:modified>
                    <xsl:value-of select="@LAST-CHANGE"/>
                </dcterms:modified>
            </xsl:if>
            <sh:datatype>xs:double</sh:datatype>
        </cas:Property>
    </xsl:template>

    <!-- Template for ATTRIBUTE-DEFINITION-BOOLEAN -->
    <xsl:template match="*[local-name()='ATTRIBUTE-DEFINITION-BOOLEAN']">
        <cas:Property rdf:type="owl:DatatypeProperty">
            <xsl:attribute name="id">
                <xsl:value-of select="@IDENTIFIER"/>
            </xsl:attribute>
            <dcterms:title>
                <xsl:value-of select="@LONG-NAME"/>
            </dcterms:title>
            <xsl:if test="@DESC and string-length(@DESC) &gt; 0">
                <dcterms:description>
                    <xsl:value-of select="@DESC"/>
                </dcterms:description>
            </xsl:if>
            <xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
                <dcterms:modified>
                    <xsl:value-of select="@LAST-CHANGE"/>
                </dcterms:modified>
            </xsl:if>
            <sh:datatype>xs:boolean</sh:datatype>
        </cas:Property>
    </xsl:template>

    <!-- Template for ATTRIBUTE-DEFINITION-DATE -->
    <xsl:template match="*[local-name()='ATTRIBUTE-DEFINITION-DATE']">
        <cas:Property rdf:type="owl:DatatypeProperty">
            <xsl:attribute name="id">
                <xsl:value-of select="@IDENTIFIER"/>
            </xsl:attribute>
            <dcterms:title>
                <xsl:value-of select="@LONG-NAME"/>
            </dcterms:title>
            <xsl:if test="@DESC and string-length(@DESC) &gt; 0">
                <dcterms:description>
                    <xsl:value-of select="@DESC"/>
                </dcterms:description>
            </xsl:if>
            <xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
                <dcterms:modified>
                    <xsl:value-of select="@LAST-CHANGE"/>
                </dcterms:modified>
            </xsl:if>
            <sh:datatype>xs:dateTime</sh:datatype>
        </cas:Property>
    </xsl:template>

    <!-- Template for ATTRIBUTE-DEFINITION-ENUMERATION -->
    <xsl:template match="*[local-name()='ATTRIBUTE-DEFINITION-ENUMERATION']">
        <cas:Property rdf:type="owl:DatatypeProperty">
            <xsl:attribute name="id">
                <xsl:value-of select="@IDENTIFIER"/>
            </xsl:attribute>
            <dcterms:title>
                <xsl:value-of select="@LONG-NAME"/>
            </dcterms:title>
            <xsl:if test="@DESC and string-length(@DESC) &gt; 0">
                <dcterms:description>
                    <xsl:value-of select="@DESC"/>
                </dcterms:description>
            </xsl:if>
            <xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
                <dcterms:modified>
                    <xsl:value-of select="@LAST-CHANGE"/>
                </dcterms:modified>
            </xsl:if>
            <sh:datatype>xs:string</sh:datatype>
        </cas:Property>
    </xsl:template>

    <!-- Template for SPEC-OBJECT-TYPE as Entity -->
    <xsl:template match="*[local-name()='SPEC-OBJECT-TYPE']" mode="entity">
        <cas:Entity rdf:type="owl:Class">
            <xsl:attribute name="id">
                <xsl:value-of select="@IDENTIFIER"/>
            </xsl:attribute>
            <dcterms:title>
                <xsl:value-of select="@LONG-NAME"/>
            </dcterms:title>
            <xsl:if test="@DESC and string-length(@DESC) &gt; 0">
                <dcterms:description>
                    <xsl:value-of select="@DESC"/>
                </dcterms:description>
            </xsl:if>
            <xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
                <dcterms:modified>
                    <xsl:value-of select="@LAST-CHANGE"/>
                </dcterms:modified>
            </xsl:if>
            <!-- Add enumeratedProperty for each ATTRIBUTE-DEFINITION -->
            <xsl:for-each select="*[local-name()='SPEC-ATTRIBUTES']/*[starts-with(local-name(), 'ATTRIBUTE-DEFINITION-')]">
                <cas:enumeratedProperty>
                    <xsl:value-of select="@IDENTIFIER"/>
                </cas:enumeratedProperty>
            </xsl:for-each>
        </cas:Entity>
    </xsl:template>

    <!-- Template for SPECIFICATION-TYPE as Entity -->
    <xsl:template match="*[local-name()='SPECIFICATION-TYPE']" mode="entity">
        <cas:Entity rdf:type="owl:Class">
            <xsl:attribute name="id">
                <xsl:value-of select="@IDENTIFIER"/>
            </xsl:attribute>
            <dcterms:title>
                <xsl:value-of select="@LONG-NAME"/>
            </dcterms:title>
            <xsl:if test="@DESC and string-length(@DESC) &gt; 0">
                <dcterms:description>
                    <xsl:value-of select="@DESC"/>
                </dcterms:description>
            </xsl:if>
            <xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
                <dcterms:modified>
                    <xsl:value-of select="@LAST-CHANGE"/>
                </dcterms:modified>
            </xsl:if>
            <!-- Add enumeratedProperty for each ATTRIBUTE-DEFINITION -->
            <xsl:for-each select="*[local-name()='SPEC-ATTRIBUTES']/*[starts-with(local-name(), 'ATTRIBUTE-DEFINITION-')]">
                <cas:enumeratedProperty>
                    <xsl:value-of select="@IDENTIFIER"/>
                </cas:enumeratedProperty>
            </xsl:for-each>
        </cas:Entity>
    </xsl:template>

    <!-- Template for SPEC-RELATION-TYPE as Relationship -->
    <xsl:template match="*[local-name()='SPEC-RELATION-TYPE']" mode="relationship">
        <xsl:variable name="relationTypeId" select="@IDENTIFIER"/>

        <!-- Create the Relationship class -->
        <cas:Relationship rdf:type="owl:Class">
            <xsl:attribute name="id">
                <xsl:value-of select="$relationTypeId"/>
            </xsl:attribute>
            <dcterms:title>
                <xsl:value-of select="@LONG-NAME"/>
            </dcterms:title>
            <xsl:if test="@DESC and string-length(@DESC) &gt; 0">
                <dcterms:description>
                    <xsl:value-of select="@DESC"/>
                </dcterms:description>
            </xsl:if>
            <xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
                <dcterms:modified>
                    <xsl:value-of select="@LAST-CHANGE"/>
                </dcterms:modified>
            </xsl:if>
            <!-- Add enumeratedProperty for each ATTRIBUTE-DEFINITION -->
            <xsl:for-each select="*[local-name()='SPEC-ATTRIBUTES']/*[starts-with(local-name(), 'ATTRIBUTE-DEFINITION-')]">
                <cas:enumeratedProperty>
                    <xsl:value-of select="@IDENTIFIER"/>
                </cas:enumeratedProperty>
            </xsl:for-each>
        </cas:Relationship>

        <!-- Create the Source Link class -->
        <cas:Link rdf:type="owl:ObjectProperty">
            <xsl:attribute name="id">
                <xsl:value-of select="concat($relationTypeId, '-toSource')"/>
            </xsl:attribute>
            <dcterms:title>
                <xsl:value-of select="concat(@LONG-NAME, ' to Source')"/>
            </dcterms:title>
            <!-- Add enumeratedEndpoint for each SPEC-OBJECT-TYPE (all Entity classes) -->
            <xsl:for-each select="//*[local-name()='SPEC-OBJECT-TYPE']">
                <cas:enumeratedEndpoint>
                    <xsl:value-of select="@IDENTIFIER"/>
                </cas:enumeratedEndpoint>
            </xsl:for-each>
        </cas:Link>

        <!-- Create the Target Link class -->
        <cas:Link rdf:type="owl:ObjectProperty">
            <xsl:attribute name="id">
                <xsl:value-of select="concat($relationTypeId, '-toTarget')"/>
            </xsl:attribute>
            <dcterms:title>
                <xsl:value-of select="concat(@LONG-NAME, ' to Target')"/>
            </dcterms:title>
            <!-- Add enumeratedEndpoint for each SPEC-OBJECT-TYPE (all Entity classes) -->
            <xsl:for-each select="//*[local-name()='SPEC-OBJECT-TYPE']">
                <cas:enumeratedEndpoint>
                    <xsl:value-of select="@IDENTIFIER"/>
                </cas:enumeratedEndpoint>
            </xsl:for-each>
        </cas:Link>
    </xsl:template>

    <!-- Template for SPEC-OBJECT (entities) -->
    <xsl:template match="*[local-name()='SPEC-OBJECT']">
        <xsl:variable name="objectId" select="@IDENTIFIER"/>
        <xsl:variable name="typeRef" select="*[local-name()='TYPE']/*[local-name()='SPEC-OBJECT-TYPE-REF']"/>
        <xsl:variable name="values" select="*[local-name()='VALUES']"/>
        <!-- Find attribute definition IDs for title and description -->
        <xsl:variable name="nameAttrDefString" select="//*[local-name()='ATTRIBUTE-DEFINITION-STRING'][
            @LONG-NAME='ReqIF.Name' or
            @LONG-NAME='ReqIF.ChapterName' or
            @LONG-NAME='Name' or
            @LONG-NAME='Title'
        ]/@IDENTIFIER"/>
        <xsl:variable name="nameAttrDefXhtml" select="//*[local-name()='ATTRIBUTE-DEFINITION-XHTML'][
            @LONG-NAME='ReqIF.Name' or
            @LONG-NAME='ReqIF.ChapterName' or
            @LONG-NAME='Name' or
            @LONG-NAME='Title'
        ]/@IDENTIFIER"/>
        <xsl:variable name="textAttrDefXhtml" select="//*[local-name()='ATTRIBUTE-DEFINITION-XHTML'][
            @LONG-NAME='ReqIF.Text' or
            @LONG-NAME='Description' or
            @LONG-NAME='Text'
        ]/@IDENTIFIER"/>
        <xsl:variable name="textAttrDefString" select="//*[local-name()='ATTRIBUTE-DEFINITION-STRING'][
            @LONG-NAME='ReqIF.Text' or
            @LONG-NAME='Description' or
            @LONG-NAME='Text'
        ]/@IDENTIFIER"/>

        <!-- Entity title: try STRING, then XHTML -->
        <xsl:variable name="titleValueString">
            <xsl:call-template name="getAttributeValue">
                <xsl:with-param name="values" select="$values"/>
                <xsl:with-param name="attrDefId" select="$nameAttrDefString"/>
            </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="titleValueXhtml">
            <xsl:call-template name="getAttributeValue">
                <xsl:with-param name="values" select="$values"/>
                <xsl:with-param name="attrDefId" select="$nameAttrDefXhtml"/>
            </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="titleValue">
            <xsl:choose>
                <xsl:when test="string-length(normalize-space($titleValueString)) &gt; 0">
                    <xsl:value-of select="$titleValueString"/>
                </xsl:when>
                <xsl:when test="string-length(normalize-space($titleValueXhtml)) &gt; 0">
                    <xsl:value-of select="$titleValueXhtml"/>
                </xsl:when>
                <xsl:otherwise/>
            </xsl:choose>
        </xsl:variable>

        <!-- Entity description: try XHTML, then STRING -->
        <xsl:variable name="descriptionValueXhtml">
            <xsl:call-template name="getAttributeValue">
                <xsl:with-param name="values" select="$values"/>
                <xsl:with-param name="attrDefId" select="$textAttrDefXhtml"/>
            </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="descriptionValueString">
            <xsl:call-template name="getAttributeValue">
                <xsl:with-param name="values" select="$values"/>
                <xsl:with-param name="attrDefId" select="$textAttrDefString"/>
            </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="descriptionValue">
            <xsl:choose>
                <xsl:when test="string-length(normalize-space($descriptionValueXhtml)) &gt; 0">
                    <xsl:value-of select="$descriptionValueXhtml"/>
                </xsl:when>
                <xsl:when test="string-length(normalize-space($descriptionValueString)) &gt; 0">
                    <xsl:value-of select="$descriptionValueString"/>
                </xsl:when>
                <xsl:otherwise/>
            </xsl:choose>
        </xsl:variable>

        <xsl:variable name="hasTitle" select="string-length(normalize-space($titleValue)) &gt; 0"/>
        <xsl:variable name="hasDescription" select="string-length(normalize-space($descriptionValue)) &gt; 0"/>

        <cas:anEntity>
            <xsl:attribute name="rdf:type">
                <xsl:value-of select="$typeRef"/>
            </xsl:attribute>
            <xsl:attribute name="id">
                <xsl:value-of select="$objectId"/>
            </xsl:attribute>
            <!-- Title: Only output if found OR if neither title nor description found (fallback) -->
            <xsl:choose>
                <xsl:when test="$hasTitle">
                    <dcterms:title>
                        <xsl:value-of select="$titleValue"/>
                    </dcterms:title>
                </xsl:when>
                <xsl:when test="not($hasDescription)">
                    <dcterms:title>
                        <xsl:text>Object with id </xsl:text>
                        <xsl:value-of select="$objectId"/>
                    </dcterms:title>
                </xsl:when>
            </xsl:choose>
            <!-- Description: Output only if found -->
            <xsl:if test="$hasDescription">
                <dcterms:description>
                    <xsl:value-of select="$descriptionValue"/>
                </dcterms:description>
            </xsl:if>
            <dcterms:modified>
                <xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
                    <xsl:value-of select="@LAST-CHANGE"/>
                </xsl:if>
            </dcterms:modified>
        </cas:anEntity>
    </xsl:template>

    <!-- Named template to get attribute value from either STRING or XHTML -->
    <xsl:template name="getAttributeValue">
        <xsl:param name="values"/>
        <xsl:param name="attrDefId"/>
        <xsl:variable name="stringValue" select="$values/*[
            local-name()='ATTRIBUTE-VALUE-STRING' and
            *[local-name()='DEFINITION']/*[local-name()='ATTRIBUTE-DEFINITION-STRING-REF'] = $attrDefId
        ]"/>
        <xsl:variable name="xhtmlValue" select="$values/*[
            local-name()='ATTRIBUTE-VALUE-XHTML' and
            *[local-name()='DEFINITION']/*[local-name()='ATTRIBUTE-DEFINITION-XHTML-REF'] = $attrDefId
        ]"/>
        <xsl:choose>
            <xsl:when test="$stringValue/@THE-VALUE and string-length($stringValue/@THE-VALUE) &gt; 0">
                <xsl:value-of select="$stringValue/@THE-VALUE"/>
            </xsl:when>
            <xsl:when test="$stringValue/*[local-name()='THE-VALUE'] and string-length($stringValue/*[local-name()='THE-VALUE']) &gt; 0">
                <xsl:value-of select="$stringValue/*[local-name()='THE-VALUE']"/>
            </xsl:when>
            <xsl:when test="$xhtmlValue/*[local-name()='THE-VALUE']">
                <xsl:copy-of select="$xhtmlValue/*[local-name()='THE-VALUE']/node()"/>
            </xsl:when>
            <xsl:when test="$xhtmlValue/@THE-VALUE and string-length($xhtmlValue/@THE-VALUE) &gt; 0">
                <xsl:value-of select="$xhtmlValue/@THE-VALUE"/>
            </xsl:when>
        </xsl:choose>
    </xsl:template>

    <!-- Template for SPEC-RELATION (relationships) -->
    <xsl:template match="*[local-name()='SPEC-RELATION']">
        <xsl:variable name="relationId" select="@IDENTIFIER"/>
        <xsl:variable name="typeRef" select="*[local-name()='TYPE']/*[local-name()='SPEC-RELATION-TYPE-REF']"/>
        <xsl:variable name="values" select="*[local-name()='VALUES']"/>
        <xsl:variable name="sourceRef" select="*[local-name()='SOURCE']/*[local-name()='SPEC-OBJECT-REF']"/>
        <xsl:variable name="targetRef" select="*[local-name()='TARGET']/*[local-name()='SPEC-OBJECT-REF']"/>

        <!-- Find attribute definition IDs for title and description (same as SPEC-OBJECT) -->
        <xsl:variable name="nameAttrDefString" select="//*[local-name()='ATTRIBUTE-DEFINITION-STRING'][
            @LONG-NAME='ReqIF.Name' or
            @LONG-NAME='ReqIF.ChapterName' or
            @LONG-NAME='Name' or
            @LONG-NAME='Title'
        ]/@IDENTIFIER"/>
        <xsl:variable name="nameAttrDefXhtml" select="//*[local-name()='ATTRIBUTE-DEFINITION-XHTML'][
            @LONG-NAME='ReqIF.Name' or
            @LONG-NAME='ReqIF.ChapterName' or
            @LONG-NAME='Name' or
            @LONG-NAME='Title'
        ]/@IDENTIFIER"/>
        <xsl:variable name="textAttrDefXhtml" select="//*[local-name()='ATTRIBUTE-DEFINITION-XHTML'][
            @LONG-NAME='ReqIF.Text' or
            @LONG-NAME='Description' or
            @LONG-NAME='Text'
        ]/@IDENTIFIER"/>
        <xsl:variable name="textAttrDefString" select="//*[local-name()='ATTRIBUTE-DEFINITION-STRING'][
            @LONG-NAME='ReqIF.Text' or
            @LONG-NAME='Description' or
            @LONG-NAME='Text'
        ]/@IDENTIFIER"/>

        <!-- Relationship title: try STRING, then XHTML -->
        <xsl:variable name="titleValueString">
            <xsl:call-template name="getAttributeValue">
                <xsl:with-param name="values" select="$values"/>
                <xsl:with-param name="attrDefId" select="$nameAttrDefString"/>
            </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="titleValueXhtml">
            <xsl:call-template name="getAttributeValue">
                <xsl:with-param name="values" select="$values"/>
                <xsl:with-param name="attrDefId" select="$nameAttrDefXhtml"/>
            </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="titleValue">
            <xsl:choose>
                <xsl:when test="string-length(normalize-space($titleValueString)) &gt; 0">
                    <xsl:value-of select="$titleValueString"/>
                </xsl:when>
                <xsl:when test="string-length(normalize-space($titleValueXhtml)) &gt; 0">
                    <xsl:value-of select="$titleValueXhtml"/>
                </xsl:when>
                <xsl:otherwise/>
            </xsl:choose>
        </xsl:variable>

        <!-- Relationship description: try XHTML, then STRING -->
        <xsl:variable name="descriptionValueXhtml">
            <xsl:call-template name="getAttributeValue">
                <xsl:with-param name="values" select="$values"/>
                <xsl:with-param name="attrDefId" select="$textAttrDefXhtml"/>
            </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="descriptionValueString">
            <xsl:call-template name="getAttributeValue">
                <xsl:with-param name="values" select="$values"/>
                <xsl:with-param name="attrDefId" select="$textAttrDefString"/>
            </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="descriptionValue">
            <xsl:choose>
                <xsl:when test="string-length(normalize-space($descriptionValueXhtml)) &gt; 0">
                    <xsl:value-of select="$descriptionValueXhtml"/>
                </xsl:when>
                <xsl:when test="string-length(normalize-space($descriptionValueString)) &gt; 0">
                    <xsl:value-of select="$descriptionValueString"/>
                </xsl:when>
                <xsl:otherwise/>
            </xsl:choose>
        </xsl:variable>

        <xsl:variable name="hasTitle" select="string-length(normalize-space($titleValue)) &gt; 0"/>
        <xsl:variable name="hasDescription" select="string-length(normalize-space($descriptionValue)) &gt; 0"/>

        <cas:aRelationship>
            <xsl:attribute name="id">
                <xsl:value-of select="$relationId"/>
            </xsl:attribute>
            <cas:hasClass>
                <xsl:value-of select="$typeRef"/>
            </cas:hasClass>
            <!-- Title: Output only if found -->
            <xsl:if test="$hasTitle">
                <dcterms:title>
                    <xsl:value-of select="$titleValue"/>
                </dcterms:title>
            </xsl:if>
            <!-- Description: Output only if found -->
            <xsl:if test="$hasDescription">
                <dcterms:description>
                    <xsl:value-of select="$descriptionValue"/>
                </dcterms:description>
            </xsl:if>
            <dcterms:modified>
                <xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
                    <xsl:value-of select="@LAST-CHANGE"/>
                </xsl:if>
            </dcterms:modified>
            <!-- Source Link -->
            <xsl:if test="$sourceRef and string-length($sourceRef) &gt; 0">
                <cas:aSourceLink>
                    <cas:hasClass>
                        <xsl:value-of select="concat($typeRef, '-toSource')"/>
                    </cas:hasClass>
                    <idRef>
                        <xsl:value-of select="$sourceRef"/>
                    </idRef>
                </cas:aSourceLink>
            </xsl:if>
            <!-- Target Link -->
            <xsl:if test="$targetRef and string-length($targetRef) &gt; 0">
                <cas:aTargetLink>
                    <cas:hasClass>
                        <xsl:value-of select="concat($typeRef, '-toTarget')"/>
                    </cas:hasClass>
                    <idRef>
                        <xsl:value-of select="$targetRef"/>
                    </idRef>
                </cas:aTargetLink>
            </xsl:if>
        </cas:aRelationship>
    </xsl:template>
</xsl:stylesheet>
