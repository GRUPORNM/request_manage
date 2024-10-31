sap.ui.define
    (
        [],
        function () {

            "use strict";

            return {
                dateFormat: function (oDate) {
                    if (oDate) {
                        var oDate = (oDate instanceof Date) ? oDate : new Date(oDate);
                        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd.MM.yyyy" });

                        return dateFormat.format(oDate);
                    }
                }
            };

        });