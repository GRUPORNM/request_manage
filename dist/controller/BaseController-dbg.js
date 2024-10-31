sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "../model/formatter"
], function (Controller, UIComponent, formatter) {
    "use strict";

    var TQAModel;

    return Controller.extend("requestmanagement.controller.BaseController", {

        formatter: formatter,

        getModelTQA: function () {
            return TQAModel;
        },

        setModelTQA: function (token) {
            var userLanguage = sessionStorage.getItem("oLangu");
            if (!userLanguage) {
                userLanguage = "EN";
            }
            var serviceUrlWithLanguage = this.getModel().sServiceUrl + (this.getModel().sServiceUrl.includes("?") ? "&" : "?") + "sap-language=" + userLanguage;

            TQAModel = new sap.ui.model.odata.v2.ODataModel({
                serviceUrl: serviceUrlWithLanguage,
                annotationURI: "/zsrv_iwfnd/Annotations(TechnicalName='%2FTQA%2FOD_REQUEST_MANAGE_ANNO_MDL',Version='0001')/$value/",
                headers: {
                    "authorization": token,
                    "applicationName": "REQUEST_MANAGE"
                }
            });

            var vModel = new sap.ui.model.odata.v2.ODataModel({
                serviceUrl: "/sap/opu/odata/TQA/OD_VARIANTS_MANAGEMENT_SRV",
                headers: {
                    "authorization": token,
                    "applicationName": "REQUEST_MANAGE"
                }
            });
            this.setModel(vModel, "vModel");
            this.setModel(TQAModel);
        },

        getRouter: function () {
            return UIComponent.getRouterFor(this);
        },

        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        onNavigation: function (sPath, oRoute, oEntityName) {
            if (sPath) {
                this.getRouter().navTo(oRoute, {
                    objectId: sPath.replace(oEntityName, "")
                });
            } else {
                this.getRouter().navTo(oRoute, {});
            }
        },

        onObjectMatched: function (oEvent) {
            this.onBindView("/" + oEvent.getParameter("config").pattern.replace("/{objectId}", "") + oEvent.getParameter("arguments").objectId, oEvent.getParameter("arguments").bForceRefresh);
        },

        onNavBack: function () {
            sessionStorage.setItem("goToLaunchpad", "X");
            this.onNavigation("", "requests", "");
        },

        onBindView: function (sObjectPath, bForceRefresh) {
            this.getView().bindElement({
                path: sObjectPath,
                change: this.onBindingChange.bind(this),
                events: {
                    dataRequested: function () {
                        this.getModel("appView").setProperty("/busy", true);
                    }.bind(this),
                    dataReceived: function () {
                        this.getModel("appView").setProperty("/busy", false);

                        var oModel = this.getModel(),
                            oRequest = oModel.getObject(sObjectPath),
                            pChecked = this.onAddRequestInfo(sObjectPath, oRequest.request_type);

                        if (oRequest.request_status_item == "0002" || oRequest.request_status_item == "0000" || oRequest.request_status_item == "0003") {
                            sap.ui.getCore().byId("approveRequest").setProperty("visible", false);
                            sap.ui.getCore().byId("rejectRequest").setProperty("visible", false);
                            sap.ui.getCore().byId("approveRequest").setProperty("enabled", false);
                            sap.ui.getCore().byId("rejectRequest").setProperty("enabled", false);
                        } else {
                            sap.ui.getCore().byId("approveRequest").setProperty("visible", true);
                            sap.ui.getCore().byId("rejectRequest").setProperty("visible", true);
                            sap.ui.getCore().byId("approveRequest").setProperty("enabled", true);
                            sap.ui.getCore().byId("rejectRequest").setProperty("enabled", true);
                        }

                        if (!pChecked) {
                            this.onNavigation("", "requests", "")
                        }

                    }.bind(this)
                }
            });

            if (bForceRefresh || !this.getView().getModel().getProperty("/" + sObjectPath)) {
                this.getView().getModel().refresh();
            }
        },

        onOpenDocument: function (oEvent) {
            var sPath = oEvent.getSource().getBindingContext().getPath(),
                oDocument = this.getModel().getObject(sPath).document;

            this._pdfViewer = new sap.m.PDFViewer();

            if (oDocument != '') {
                var decodedPdfContent = atob(oDocument);

                if (decodedPdfContent.indexOf(',') != -1)
                    decodedPdfContent = decodedPdfContent.substring(decodedPdfContent.indexOf(',') + 1, decodedPdfContent.length);

                decodedPdfContent = atob(decodedPdfContent);

                var byteArray = new Uint8Array(decodedPdfContent.length)

                for (var i = 0; i < decodedPdfContent.length; i++) {
                    byteArray[i] = decodedPdfContent.charCodeAt(i);
                }

                var blob = new Blob([byteArray.buffer], { type: "application/pdf" }),
                    _pdfurl = URL.createObjectURL(blob);

                this._PDFViewer = new sap.m.PDFViewer({
                    width: "auto",
                    showDownloadButton: false,
                    source: _pdfurl
                });

                jQuery.sap.addUrlWhitelist("blob");

                this._PDFViewer.open();
            }
        },

        onBindingChange: function () {
            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();

            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("notFound");

                return;
            }
        },

        buildDialogs: function (oDialogInfo, aDialogFields, aDialogButtons) {
            try {
                this.oDialog = new sap.m.Dialog({
                    title: oDialogInfo.oTitle,
                    id: oDialogInfo.oId,
                    afterClose: this.onAfterClose.bind(this)
                });

                if (aDialogFields.length > 0) {
                    this.oDialog.addContent(this.oGrid = new sap.ui.layout.Grid({
                        defaultSpan: "L12 M12 S12",
                        width: "auto"
                    }));


                    this.oGrid.addContent(this.oSimpleForm = new sap.ui.layout.form.SimpleForm({
                        id: oDialogInfo.oId + "SimpleForm",
                        minWidth: 1024,
                        layout: oDialogInfo.oLayout,
                        labelSpanL: 3,
                        labelSpanM: 3,
                        emptySpanL: 4,
                        emptySpanM: 4,
                        columnsL: 2,
                        columnsM: 2,
                        maxContainerCols: 2,
                        editable: false
                    }));

                    aDialogFields.forEach(oField => {
                        switch (oField.oControl) {

                            case sap.m.Input:
                                this.oSimpleForm.addContent(
                                    new sap.m.Label({ text: oField.oLabelText, required: oField.oRequired })
                                )

                                this.oInput = new sap.m.Input({
                                    id: oField.oId,
                                    name: oField.oName,
                                    enabled: oField.oEnabled
                                });

                                if (oField.oSelectedKey != "") {
                                    this.oInput.setSelectedKey(oField.oSelectedKey);
                                } else if (oField.oValue != "") {
                                    this.oInput.setValue(oField.oValue);
                                }

                                this.oSimpleForm.addContent(this.oInput);
                                break;

                            case sap.m.Select:
                                if (oField.oItems != "") {
                                    this.oSimpleForm.addContent(
                                        new sap.m.Label({ text: oField.oLabelText, required: oField.oRequired })
                                    );

                                    this.oSelect = new sap.m.Select({
                                        id: oField.oId,
                                        name: oField.oName,
                                        enabled: oField.oEnabled,
                                        change: this.onSelectChange.bind(this),
                                        forceSelection: oField.oForceSelection,
                                    });

                                    this.oSelect.setModel(this.getModel());

                                    this.oSelect.bindAggregation("items", {
                                        path: oField.oItems,
                                        template: new sap.ui.core.Item({
                                            key: oField.oKey,
                                            text: oField.oText
                                        })
                                    });

                                    if (oField.oSelectedKey != "") {
                                        this.oSelect.setSelectedKey(oField.oSelectedKey);
                                    }

                                    this.oSimpleForm.addContent(this.oSelect);
                                }
                                break;

                            case sap.m.DatePicker:

                                this.oSimpleForm.addContent(
                                    new sap.m.Label({ text: oField.oLabelText })
                                );

                                this.oDatePicker = new sap.m.DatePicker({
                                    id: oField.oId,
                                    name: oField.oName,
                                    value: oField.oValue,
                                    valueFormat: oField.oValueFormat,
                                    required: oField.oRequired,
                                    enabled: oField.oEnabled,
                                    displayFormat: oField.oDisplayFormat,
                                    minDate: oField.oMinDate
                                })

                                if (oField.oValue1 != "") {
                                    this.oDatePicker.setDateValue(oField.oValue1);
                                }

                                this.oSimpleForm.addContent(this.oDatePicker);
                                break;

                            case sap.ui.unified.FileUploader:

                                this.oSimpleForm.addContent(
                                    new sap.m.Label({ text: oField.oLabelText }),
                                );

                                this.oFileUploader = new sap.ui.unified.FileUploader({
                                    id: oField.oId,
                                    name: oField.oName,
                                    enabled: oField.oEnabled,

                                    width: "100%",
                                    tooltip: oField.oTooltip
                                })

                                if (oField.oValue1 != "") {
                                    this.oFileUploader.setValue(oField.oValue);
                                }

                                this.oSimpleForm.addContent(this.oFileUploader);

                                break;

                            case sap.m.TextArea:
                                this.oSimpleForm.addContent(
                                    new sap.m.Label({ text: oField.oLabelText }),
                                );

                                this.oTextArea = new sap.m.TextArea({
                                    id: oField.oId,
                                    enabled: oField.oEnabled,
                                    required: oField.oRequired,
                                    name: oField.oId
                                })

                                this.oSimpleForm.addContent(this.oTextArea);
                                break;

                        }
                    });

                    if (aDialogButtons.length > 0) {
                        aDialogButtons.forEach(oButton => {
                            this.oDialog.addButton(
                                new sap.m.Button({
                                    id: oButton.oId,
                                    text: oButton.oText,
                                    type: oButton.oType,
                                    press: oButton.oEvent
                                })
                            );
                        });
                    }

                }

                this.oDialog.open();

            } catch (error) {
                var oMessage = {
                    oText: error.message,
                    oTitle: this.getResourceBundle().getText("errorMessageBoxTitle")
                }

                this.showErrorMessage(oMessage);
            }
        },

        onCloseDialog: function () {
            this.oDialog.close();
        },

        onAfterClose: function () {
            if (this.oDialog) {
                this.oDialog.destroy();
                this.oDialog = null;
            }
        },

        showErrorMessage: function (oMessage) {
            new sap.m.MessageBox.error(oMessage.oText, {
                title: oMessage.oTitle,
                actions: [sap.m.MessageBox.Action.OK],
                emphasizedAction: sap.m.MessageBox.Action.OK
            });
        },

        getFields: function (aControl, aContainers, oMainControl) {
            this.aFields = [];
            aContainers.forEach(oContainer => {

                for (let i = 0; i < aControl.length; i++) {

                    if (oMainControl == "Dialog") {
                        var aContainerFields = sap.ui.getCore().byId(oContainer).getContent().filter(function (oControl) {
                            return oControl instanceof aControl[i];
                        });

                        aContainerFields.forEach(oContainerField => {
                            var oField = {
                                id: "",
                                value: ""
                            };

                            oField.id = oContainerField.getName();

                            try {
                                oField.value = oContainerField.getValue()
                            } catch (error) {
                                oField.value = oContainerField.getSelectedKey();
                            }

                            this.aFields.push(oField);
                        });
                    } else {
                        var aContainerFields = this.byId(oContainer).getContent().filter(function (oControl) {
                            return oControl instanceof aControl[i];
                        });

                        aContainerFields.forEach(oContainerField => {
                            var oField = {
                                id: "",
                                value: ""
                            };

                            oField.id = oContainerField.getName();
                            oField.value = oContainerField.getValue()

                            this.aFields.push(oField);
                        });
                    }

                }

            });

            return this.aFields;
        },

        checkEmptyFields: function (aControl, aContainers, oMainControl) {
            this.getFields(aControl, aContainers, oMainControl);
            this.checked = true;

            if (this.aFields.length > 0) {

                this.aFields.forEach(oField => {
                    if (oMainControl == "Dialog") {
                        var oControl = sap.ui.getCore().byId(oField.id);
                    } else {
                        var oControl = this.byId(oField.id);
                    }

                    if (oControl) {
                        if (oControl.getProperty("enabled")) {
                            try {
                                if (oControl.getValue() == "") {
                                    oControl.setValueState("Error");
                                    this.checked = false;
                                } else {
                                    oControl.setValueState("None");
                                }
                            } catch (error) {
                                if (oControl.getSelectedKey() == "") {
                                    oControl.setValueState("Error");
                                    this.checked = false;
                                } else {
                                    oControl.setValueState("None");
                                }
                            }
                        }
                    }
                });

                if (this.checked) {
                    return true;
                } else {
                    return false;
                }
            }
        },

        onUpdate: function (sPath, oEntry) {
            try {
                if (sPath) {
                    var oModel = this.getModel(),
                        oAppViewModel = this.getModel("appView");

                    sap.ui.core.BusyIndicator.show();
                    oModel.update(sPath, oEntry, {
                        success: function () {
                            sap.ui.core.BusyIndicator.hide();
                            oModel.refresh(true);
                        },
                        error: function (oError) {
                            sap.ui.core.BusyIndicator.hide();
                            var sError = JSON.parse(oError.responseText).error.message.value;

                            sap.m.MessageBox.alert(sError, {
                                icon: "ERROR",
                                onClose: null,
                                styleClass: '',
                                initialFocus: null,
                                textDirection: sap.ui.core.TextDirection.Inherit
                            });
                        }
                    });

                    oModel.attachRequestSent(function () {
                        oAppViewModel.setProperty("/busy", true);
                    });
                    oModel.attachRequestCompleted(function () {
                        oAppViewModel.setProperty("/busy", false);
                    });
                    oModel.attachRequestFailed(function () {
                        oAppViewModel.setProperty("/busy", false);
                    });
                }
            } catch (error) {
                var oMessage = {
                    oText: error.message,
                    oTitle: this.getResourceBundle().getText("errorMessageBoxTitle")
                }

                this.showErrorMessage(oMessage);
            }
        },

        onAddRequestInfo: function (sObjectPath, sType) {
            var oModel = this.getModel(),
                oGeneralInfoForm = this.byId("generalInfoForm"),
                oDocumentationForm = this.byId("documentationForm");

            if (sType && sObjectPath) {
                try {
                    oGeneralInfoForm.destroyContent();
                    oDocumentationForm.destroyContent();

                    oGeneralInfoForm.addContent(
                        new sap.m.Label({
                            text: this.getResourceBundle().getText("customer")
                        })
                    );
                    oGeneralInfoForm.addContent(
                        new sap.m.Text({
                            text: "{bp} ({BpNo})"
                        })
                    );

                    oGeneralInfoForm.addContent(
                        new sap.m.Label({
                            text: this.getResourceBundle().getText("person")
                        })
                    );
                    oGeneralInfoForm.addContent(
                        new sap.m.Text({
                            text: "{request_description}"
                        })
                    );

                    oGeneralInfoForm.addContent(
                        new sap.m.Label({
                            text: this.getResourceBundle().getText("request_type")
                        })
                    );
                    oGeneralInfoForm.addContent(
                        new sap.m.Text({
                            text: "{request_type_desc}"
                        })
                    );

                    oGeneralInfoForm.addContent(
                        new sap.m.Label({
                            text: this.getResourceBundle().getText("created_by")
                        })
                    );
                    oGeneralInfoForm.addContent(
                        new sap.m.Text({
                            text: "{created_by}"
                        })
                    );

                    oGeneralInfoForm.addContent(
                        new sap.m.Label({
                            text: this.getResourceBundle().getText("justification")
                        })
                    );
                    oGeneralInfoForm.addContent(
                        new sap.m.Text({
                            text: "{justification}"
                        })
                    );

                    switch (sType) {
                        case "0001":  // USERS

                            var oTable = new sap.m.Table({
                                id: "UserDocumentationTable",
                                width: "100%",
                                busyIndicatorDelay: "{appView>/delay}"
                            });

                            var aColumns = [
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("doc_no") }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("doc_type") }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("issue_date") }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("exp_date") }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("doc_status") }) })
                            ];

                            aColumns.forEach(oColumn => {
                                oTable.addColumn(oColumn);
                            });

                            var oItemTemplate = new sap.m.ColumnListItem({
                                type: sap.m.ListType.Navigation,
                                press: this.onOpenDocument.bind(this)
                            });

                            var aCells = [
                                new sap.m.ObjectIdentifier({ text: "{document_no}" }),
                                new sap.m.ObjectIdentifier({ title: "{doc_type_desc}", text: "{doc_subty_desc}" }),
                                new sap.m.ObjectIdentifier({
                                    text: { path: "issue_date", formatter: this.formatter.dateFormat.bind(this.formatter) }
                                }),
                                new sap.m.ObjectIdentifier({
                                    text: { path: "exp_date", formatter: this.formatter.dateFormat.bind(this.formatter) }

                                }),
                                new sap.m.ObjectStatus({
                                    text: "{doc_status_desc}",
                                    state: {
                                        path: "doc_status",
                                        formatter: function (oStatus) {
                                            if (oStatus) {
                                                switch (oStatus) {
                                                    case "0001":
                                                        return "Success";
                                                        break;
                                                    case "0002":
                                                        return "Error";
                                                        break;
                                                    case "0003":
                                                        return "Warning";
                                                        break;
                                                }
                                            }
                                        }
                                    }
                                })
                            ];

                            aCells.forEach(oCell => {
                                oItemTemplate.addCell(oCell);
                            });

                            oTable.bindAggregation("items", {
                                path: "toUserRequest",
                                template: oItemTemplate
                            });

                            oDocumentationForm.addContent(oTable);

                            break;

                        case "0002":  // EQUIPMENTS

                            var oTable = new sap.m.Table({
                                id: "EquiDocumentationTable",
                                width: "100%",
                                busyIndicatorDelay: "{appView>/delay}"
                            });

                            var aColumns = [
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("equi_attach_type_desc") }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("issue_date") }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("exp_date") }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("comments") }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("doc_status") }) })
                            ];

                            aColumns.forEach(oColumn => {
                                oTable.addColumn(oColumn);
                            });

                            var oItemTemplate = new sap.m.ColumnListItem({
                                type: sap.m.ListType.Navigation,
                                press: this.onOpenDocument.bind(this)
                            });

                            var aCells = [
                                new sap.m.ObjectIdentifier({ text: "{equi_attach_type_desc}" }),
                                new sap.m.ObjectIdentifier({
                                    text: { path: "issue_date", formatter: this.formatter.dateFormat.bind(this.formatter) }
                                }),
                                new sap.m.ObjectIdentifier({
                                    text: { path: "expiration_date", formatter: this.formatter.dateFormat.bind(this.formatter) }

                                }),
                                new sap.m.ExpandableText({
                                    text: "{comments}"

                                }),
                                new sap.m.ObjectStatus({
                                    text: "{doc_status_desc}",
                                    state: {
                                        path: "doc_status",
                                        formatter: function (oStatus) {
                                            if (oStatus) {
                                                switch (oStatus) {
                                                    case "0001":
                                                        return "Warning";
                                                        break;
                                                    case "0002":
                                                        return "Success";
                                                        break;
                                                    case "0003":
                                                        return "Error";
                                                        break;
                                                }
                                            }
                                        }
                                    }
                                })
                            ];

                            aCells.forEach(oCell => {
                                oItemTemplate.addCell(oCell);
                            });

                            oTable.bindAggregation("items", {
                                path: "toEquiRequest",
                                template: oItemTemplate
                            });

                            oDocumentationForm.addContent(oTable);

                            break;
                        case "0003":  // BOMS

                            var oTable = new sap.m.Table({
                                id: "BomItemsTable",
                                width: "100%",
                                busyIndicatorDelay: "{appView>/delay}"
                            });

                            var aColumns = [
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("bom_no") }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("item") }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("component_no") }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("material") }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: this.getResourceBundle().getText("quantity") }) })
                            ];

                            aColumns.forEach(oColumn => {
                                oTable.addColumn(oColumn);
                            });

                            var oItemTemplate = new sap.m.ColumnListItem({});

                            var aCells = [
                                new sap.m.ObjectIdentifier({ text: "{stlnr}" }),
                                new sap.m.ObjectIdentifier({ text: "{posnr}" }),
                                new sap.m.ObjectIdentifier({ text: "{idnrk}" }),
                                new sap.m.ObjectIdentifier({ text: "{maktx}" }),
                                new sap.m.ObjectIdentifier({ text: "{menge}" })
                            ];

                            aCells.forEach(oCell => {
                                oItemTemplate.addCell(oCell);
                            });

                            oTable.bindAggregation("items", {
                                path: "/items",
                                template: oItemTemplate
                            });

                            var sPath = sObjectPath + "/toBomRequest";
                            oModel.read(sPath, {
                                success: function (oData) {
                                    debugger;
                                    var oBomItemsModel = new sap.ui.model.json.JSONModel();
                                    oBomItemsModel.setData({ items: JSON.parse(oData.results[0].bom_items) });

                                    oTable.setModel(oBomItemsModel);
                                    oTable.bindAggregation("items", {
                                        path: "/items",
                                        template: oTable.getBindingInfo("items").template
                                    });
                                },
                                error: function (oError) {
                                    var sError = JSON.parse(oError.responseText).error.message.value;

                                    sap.m.MessageBox.alert(sError, {
                                        icon: "ERROR",
                                        onClose: null,
                                        styleClass: '',
                                        initialFocus: null,
                                        textDirection: sap.ui.core.TextDirection.Inherit
                                    });
                                }
                            });

                            oDocumentationForm.addContent(oTable);

                            break;
                    }
                    return true;

                } catch (error) {

                }
            } else {
                return false;
            }

        },

        handleApproveRequest: function (pOperation) {
            var sPath = "",
                oEntry = {
                    RequestId: "00000000-0000-0000-0000-000000000000",
                    // Usrid: "0000000000",
                    BpNo: "0000000000"
                };

            if (pOperation == "1") {
                sPath = this.getView().getBindingContext().getPath().replace("/xTQAxREQUESTS", "/ApproveRequests");
                this.onUpdate(sPath, oEntry);

                var oObject = this.getModel().getObject(this.getView().getBindingContext().getPath());

                if (oObject.request_status_item == '0002') {
                    this.onNavigation("", "requests", "");
                }
            } else {
                sPath = sap.ui.getCore().byId("RequestTable").getTable().getSelectedContextPaths()[0].replace("/xTQAxREQUESTS", "/ApproveRequests");

                sap.ui.getCore().byId("RequestTable").getTable().removeSelections();
                this._manageButtons(false, false);
                this.onUpdate(sPath, oEntry);
            }
        },

        handleRejectRequest: function (pOperation) {
            this.oOperation = pOperation;

            var aDialogFields = [],
                oJustification = {
                    oLabelText: this.getResourceBundle().getText("rejectLabel"),
                    oId: "Justification",
                    oRequired: true,
                    oValue: "",
                    oEnabled: true,
                    oControl: sap.m.TextArea
                },
                oDialogInfo = {
                    oId: "oDialog",
                    oLayout: "ResponsiveGridLayout",
                    oTitle: this.getResourceBundle().getText("rejectRequest")
                },
                aDialogButtons = [],
                oCancelButton = {
                    oId: "oCancelButton",
                    oText: this.getResourceBundle().getText("closeDialog"),
                    oType: "Default",
                    oEvent: this.onCloseDialog.bind(this)
                },
                oConfirmButton = {
                    oId: "oConfirmButton",
                    oText: this.getResourceBundle().getText("confirmButton"),
                    oType: "Emphasized",
                    oEvent: this.onRejectRequest.bind(this)
                };

            aDialogFields.push(oJustification);
            aDialogButtons.push(oCancelButton, oConfirmButton);

            this.buildDialogs(oDialogInfo, aDialogFields, aDialogButtons);
        },

        onRejectRequest: function () {
            var aControl = [],
                aContainers = [];

            aControl.push(sap.m.TextArea);
            aContainers.push("oDialogSimpleForm");

            var fieldsChecked = this.checkEmptyFields(aControl, aContainers, "Dialog");

            if (fieldsChecked) {

                var sPath = "",
                    oEntry = {
                        RequestId: "",
                        Justification: this.aFields.find(({ id }) => id === 'Justification').value
                    };

                if (this.oOperation == "1") {
                    oEntry.RequestId = this.getView().getBindingContext().getPath().RequestId;
                    sPath = this.getView().getBindingContext().getPath().replace("/xTQAxREQUESTS", "/ReproveRequests");
                } else {
                    oEntry.RequestId = this.getModel().getObject(sap.ui.getCore().byId("RequestTable").getTable().getSelectedContextPaths()[0]).RequestId;
                    sPath = sap.ui.getCore().byId("RequestTable").getTable().getSelectedContextPaths()[0].replace("/xTQAxREQUESTS", "/ReproveRequests");

                    sap.ui.getCore().byId("RequestTable").getTable().removeSelections();
                    this._manageButtons(false, false);
                }

                this.onCloseDialog();
                this.onUpdate(sPath, oEntry);
            }
        },

        getUserAuthentication: function (type) {
            var that = this,
                urlParams = new URLSearchParams(window.location.search),
                token = urlParams.get('token');

            if (token != null) {
                var headers = new Headers();
                headers.append("X-authorization", token);

                var requestOptions = {
                    method: 'GET',
                    headers: headers,
                    redirect: 'follow'
                };

                fetch("/sap/opu/odata/TQA/AUTHENTICATOR_SRV/USER_AUTHENTICATION", requestOptions)
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error("Ocorreu um erro ao ler a entidade.");
                        }
                        return response.text();
                    })
                    .then(function (xml) {
                        var parser = new DOMParser(),
                            xmlDoc = parser.parseFromString(xml, "text/xml"),
                            successResponseElement = xmlDoc.getElementsByTagName("d:SuccessResponse")[0],
                            response = successResponseElement.textContent;

                        if (response != 'X') {
                            that.getRouter().navTo("NotFound");
                        }
                        else {
                            that.getModel("appView").setProperty("/token", token);
                        }
                    })
                    .catch(function (error) {
                        console.error(error);
                    });
            } else {
                that.getRouter().navTo("NotFound");
                return;
            }
        },
    });
});